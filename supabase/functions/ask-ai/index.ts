import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.6"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { query, subjectId: rawSubjectId, mode, chatHistory } = await req.json()
    const subjectId = rawSubjectId?.toString() // garante que subject_id seja string para comparar com metadata JSONB

    if (!query) throw new Error('Query é obrigatória')

    const googleKey = Deno.env.get('GOOGLE_API_KEY') || Deno.env.get('google_api_key') || Deno.env.get('Google_api_key')
    if (!googleKey) throw new Error('A chave do Google (Gemini) não foi encontrada nas secrets do Supabase')

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log(`Buscando resposta Gemini para: "${query}" (Subject: ${subjectId})`)

    // 1. Criar embedding da pergunta do usuário com gemini-embedding-001 (768 Dimensões)
    const embedResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${googleKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: { parts: [{ text: query }] },
        outputDimensionality: 768
      })
    })

    if (!embedResponse.ok) {
        throw new Error(`Erro ao gerar embedding Gemini: ${await embedResponse.text()}`)
    }
    
    const embedData = await embedResponse.json()
    const queryEmbedding = embedData.embedding?.values

    if (!queryEmbedding) throw new Error('Falha ao gerar embedding da pergunta no Gemini')

    // 2. Buscar chunks similares no banco
    const matchThreshold = 0.2
    const matchCount = 15 

    const { data: documents, error: matchError } = await supabase.rpc('match_document_chunks', {
      query_embedding: queryEmbedding,
      match_threshold: matchThreshold,
      match_count: matchCount,
      filter_subject_id: subjectId
    })

    if (matchError) {
       console.error("Erro RPC match_document_chunks:", matchError.message)
    }

    console.log(`Chunks encontrados via RPC (${subjectId}): ${documents?.length || 0}`)
    let contextText = ''
    let sources: string[] = []
    if (documents && documents.length > 0) {
      contextText = documents.map((doc: any) => doc.content).join('\n\n')
      // Extrair nomes únicos dos materiais usados
      const nameSet = new Set<string>()
      documents.forEach((doc: any) => {
        const name = doc.metadata?.name
        if (name) nameSet.add(name)
      })
      sources = Array.from(nameSet)
    }

    const hasContext = !!contextText.trim();
    if (!hasContext) {
      contextText = "NENHUM MATERIAL ENCONTRADO NO BANCO DE DADOS PARA ESTA MATÉRIA NO MOMENTO."
    }

    // 3. Preparar o prompt do sistema
    const systemInstruction = `Você é o Professor IA da plataforma Estuda.AÍ.
Seu objetivo é ajudar o aluno baseado nos materiais de estudo fornecidos.
Responda de forma clara, profissional e didática. Use Markdown.
${hasContext ? '' : 'AVISO: Não encontramos materiais específicos. Responda com seu conhecimento geral acadêmico, mas mencione que não encontrou nos arquivos da disciplina.'}`

    const contents: any[] = []
    
    // Inserir Histórico do Chat interativo (se existir)
    if (chatHistory && Array.isArray(chatHistory)) {
        for (const msg of chatHistory) {
            if (msg.text && msg.role) {
                contents.push({ role: msg.role, parts: [{ text: msg.text }] })
            }
        }
    }

    let finalQuery = query
    if (contextText) {
        finalQuery = `INFORMAÇÃO DE CONTEXTO DOS DOCUMENTOS (RESPONDA E CORRIJA BASEANDO-SE NISSO):\n${contextText}\n\nPERGUNTA/AÇÃO DO USUÁRIO:\n${query}`
    } else {
        finalQuery = query
    }
    
    contents.push({ role: 'user', parts: [{ text: finalQuery }] })

    // 4. Chamar Gemini 2.5 Flash usando system_instruction para separar o contexto
    const aiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${googleKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: {
          parts: [{ text: systemInstruction }]
        },
        contents: contents,
        generationConfig: {
          temperature: 0.5,
          maxOutputTokens: 2048,
        }
      })
    })

    if (!aiResponse.ok) {
        const errText = await aiResponse.text()
        console.error('Gemini Error:', errText)
        throw new Error('Erro na comunicação com o Gemini 1.5. Verifique a estrutura das mensagens.')
    }

    const aiData = await aiResponse.json()
    let textResult = aiData.candidates?.[0]?.content?.parts?.[0]?.text || "Desculpe, não consegui elaborar a resposta agora."

    return new Response(JSON.stringify({ 
      success: true, 
      answer: textResult,
      sources: sources
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Erro geral no ask-ai (Gemini):', error.message)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})