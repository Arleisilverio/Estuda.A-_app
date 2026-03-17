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
    const { query, subjectId, messages = [] } = await req.json()

    if (!query) throw new Error('A pergunta (query) é obrigatória')

    const openAiKey = Deno.env.get('OPENAI_API_KEY') || Deno.env.get('openai-api-key') || Deno.env.get('Openai_api_key') || Deno.env.get('openai_api_key')
    if (!openAiKey) throw new Error('A chave da OpenAI não foi encontrada nas secrets do Supabase')

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const authHeader = req.headers.get('Authorization')
    let userId = null
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '')
      const { data: { user } } = await supabase.auth.getUser(token)
      if (user) userId = user.id
    }

    console.log(`Buscando resposta para: "${query}" (Subject: ${subjectId})`)

    // 1. Criar embedding da pergunta do usuário com text-embedding-3-small
    const embedResponse = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: query,
        model: 'text-embedding-3-small' // MESMO MODELO DO PROCESS-DOCUMENT
      })
    })

    if (!embedResponse.ok) {
        throw new Error(`Erro ao gerar embedding: ${await embedResponse.text()}`)
    }
    
    const embedData = await embedResponse.json()
    const queryEmbedding = embedData.data?.[0]?.embedding

    if (!queryEmbedding) throw new Error('Falha ao gerar embedding da pergunta')

    // 2. Buscar chunks similares no banco (vector search usando match_document_chunks)
    const matchThreshold = 0.2 // Aumentado um pouco para evitar ruído
    const matchCount = 15 

    const { data: documents, error: matchError } = await supabase.rpc('match_document_chunks', {
      query_embedding: queryEmbedding,
      match_threshold: matchThreshold,
      match_count: matchCount,
      filter_subject_id: subjectId // Novo filtro via RPC
    })

    if (matchError) {
       console.error("Erro RPC match_document_chunks:", matchError.message)
    }

    console.log(`Chunks encontrados via RPC (${subjectId}): ${documents?.length || 0}`)
    let contextText = ''
    let sourceMaterials = new Set()

    if (documents && documents.length > 0) {
      contextText = documents.map((doc: any) => {
        if(doc.metadata && doc.metadata.name) sourceMaterials.add(doc.metadata.name)
        return doc.content
      }).join('\n\n')
    }

    const hasContext = !!contextText.trim();
    if (!hasContext) {
      contextText = "NENHUM MATERIAL ENCONTRADO NO BANCO DE DADOS PARA ESTA MATÉRIA NO MOMENTO."
    }

    // 3. Formatar o prompt para o GPT-4o-mini
    const systemPrompt = `Você é o Professor IA da plataforma Estuda.AÍ.
Seu objetivo é ajudar o aluno baseado nos materiais de estudo fornecidos abaixo.
${hasContext ? 'Use as informações dos materiais para responder.' : 'AVISO: Não encontramos materiais específicos. Responda com seu conhecimento geral acadêmico, mas mencione que não encontrou nos arquivos da disciplina.'}
Responda de forma clara, profissional e didática. Use Markdown.

MATERIAIS DE ESTUDO:
"""
${contextText}
"""`

    const openaiMessages = [
      { role: "system", content: systemPrompt },
      ...messages.slice(-10).map((m: any) => ({
        role: m.role === 'ai' || m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content
      })),
      { role: "user", content: query }
    ];

    const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: openaiMessages,
        temperature: 0.7,
        max_tokens: 2000,
      })
    })

    if (!aiResponse.ok) {
        const errText = await aiResponse.text()
        console.error('OpenAI Error:', errText)
        throw new Error('Erro na comunicação com o cérebro da IA.')
    }

    const aiData = await aiResponse.json()
    let textResult = aiData.choices?.[0]?.message?.content || "Desculpe, não consegui elaborar a resposta agora."

    // 5. Retornar dados pro front
    return new Response(JSON.stringify({ 
      success: true, 
      answer: textResult 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Erro geral no ask-ai:', error.message)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})