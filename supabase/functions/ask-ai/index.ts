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
    // BAIXANDO O THRESHOLD PARA 0.1 POIS O MODELO DA OPENAI GERA VETORES C/ METRICAS MENORES DE DISTÂNCIA COSENO
    const matchThreshold = 0.1 
    const matchCount = 8        // aumentar numero de docs retornados para dar mais chance de RAG

    const { data: documents, error: matchError } = await supabase.rpc('match_document_chunks', {
      query_embedding: queryEmbedding,
      match_threshold: matchThreshold,
      match_count: matchCount
    })

    if (matchError) {
       console.error("Erro no supabase.rpc('match_document_chunks'):", matchError)
    }

    console.log(`Chunks encontrados pela RPC match_document_chunks (threshold ${matchThreshold}): ${documents?.length || 0}`)
    let contextText = ''
    let sourceMaterials = new Set()

    if (documents && documents.length > 0) {
      // Filtrar via JS pra matéria atual, porque nem todo banco aceita passar subject pela RPC custom
      const filteredDocs = subjectId ? documents.filter((d: any) => {
          return !d.metadata?.subject_id || d.metadata.subject_id === subjectId
      }) : documents;

      console.log(`Chunks filtrados final por subjectId (${subjectId}): ${filteredDocs.length}`)

      contextText = filteredDocs.map((doc: any) => {
        if(doc.metadata && doc.metadata.name) sourceMaterials.add(doc.metadata.name)
        return doc.content
      }).join('\n\n')
    }

    if (!contextText) {
      contextText = "ATENÇÃO GPT: Você PRECISA informar ao usuário que não conseguiu encontrar a resposta nos materiais dele. Responda baseado no seu conhecimento geral, mas avise que NÃO VEIO DO MATERIAL."
    }

    console.log(`Precedentes/Fontes incluídas no Prompt do RAG: ${Array.from(sourceMaterials).join(', ')}`)

    // 3. Formatar o prompt para o GPT-4o-mini
    const systemPrompt = `Você é o Professor IA, um assistente virtual criado para ajudar alunos nos estudos.
O usuário está consultando a matéria (ID: ${subjectId}).

Você DEVE utilizar estritamente o contexto dos "Materiais de Estudo" baseados nos PDFs do aluno abaixo para embasar a sua resposta. 
Se os materiais contiverem o nome do professor ou os dados da apostila, MENCIONE ISSO! Você é o professor dessa matéria.
Responda SEMPRE EM PORTUGUÊS DO BRASIL. Formate a resposta usando markdown (negrito, listas).

MATERIAIS DE ESTUDO (RETIRADOS DOS PDFs DO ALUNO):
"""
${contextText}
"""`

    const openaiMessages = [
      { role: "system", content: systemPrompt },
      ...messages.map((m: any) => ({
        role: m.role === 'ai' ? 'assistant' : 'user',
        content: m.content
      })),
      { role: "user", content: query }
    ];

    // 4. Chamar a OpenAI
    const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: openaiMessages,
        temperature: 0.5,
        max_tokens: 1500,
      })
    })

    if (!aiResponse.ok) {
        console.error('API err:', await aiResponse.text())
        throw new Error(`Erro na OpenAI Chat API.`)
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