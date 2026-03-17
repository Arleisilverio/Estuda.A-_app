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
    const { action, subjectId, documentId } = await req.json()

    if (!action || !subjectId) {
        throw new Error('Ação (action) e ID da matéria (subjectId) são obrigatórios')
    }

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
      try {
        const { data: userData } = await supabase.auth.getUser(token)
        if (userData?.user) userId = userData.user.id
      } catch (err) {
        console.error('Falha ao verificar token:', err.message)
      }
    }

    console.log('Realizando ação NotebookLM:', action, 'Materia:', subjectId)

    // 1. Buscar conteúdo de estudo (chunks)
    let queryBuilder = supabase
       .from('document_chunks')
       .select('content, metadata, document_id')
       
    if (documentId) {
       queryBuilder = queryBuilder.eq('document_id', documentId)
    } else {
       // Filtro direto no banco por JSONB para performance e evitar limites
       queryBuilder = queryBuilder.filter('metadata->>subject_id', 'eq', subjectId)
    }

    const { data: chunks, error: docError } = await queryBuilder.limit(80)
    
    if (docError) {
        console.error('Erro ao buscar chunks:', docError.message)
    }

    const filteredChunks = chunks || []
    
    const contextText = filteredChunks.map((c: any) => c.content).join('\n\n')

    if (!contextText || filteredChunks.length === 0) {
        console.log(`Nenhum material para subjectId: ${subjectId}, docId: ${documentId}. Usando conhecimento geral.`)
        // Fallback para não dar erro crítico se for uma ação que permita conhecimento geral, 
        // mas para resumo/guia/citações o contexto é quase obrigatório.
        if (action === 'summary' || action === 'guide' || action === 'citations') {
             throw new Error('Nenhum material encontrado para processar. Certifique-se de que o material foi processado corretamente no Portal do Professor.')
        }
    }

    let prompt = ""
    let systemRole = "Você é um assistente de estudo inteligente, especialista em transformar materiais densos em conteúdos didáticos (estilo NotebookLM)."

    if (action === 'summary') {
        prompt = "TAREFA: Gere um RESUMO ESTRUTURADO PREMIUM.\n" +
                 "FORMATO:\n" +
                 "1. **Resumo Executivo**: O 'Big Picture'.\n" +
                 "2. **Tópicos Essenciais**: Detalhes técnicos importantes.\n" +
                 "3. **Insights**: O que não pode ser esquecido.\n\n" +
                 "Use Markdown. Idioma: Português do Brasil.\n\n" +
                 "MATERIAL PARA PROCESSAR:\n\"\"\"\n" + contextText + "\n\"\"\""
    } else if (action === 'guide') {
        prompt = "TAREFA: Crie um GUIA DE ESTUDO COMPACTO.\n" +
                 "FORMATO:\n" +
                 "1. **Terminologia**: Glossário de termos chave.\n" +
                 "2. **Desafio**: 3 questões para auto-avaliação.\n" +
                 "3. **Dica do Professor**: Como estudar este conteúdo.\n\n" +
                 "Use Markdown. Idioma: Português do Brasil.\n\n" +
                 "MATERIAL PARA PROCESSAR:\n\"\"\"\n" + contextText + "\n\"\"\""
    } else if (action === 'citations') {
        prompt = "TAREFA: Extraia 3 CITAÇÕES RELEVANTES.\n" +
                 "Apresente a citação exata e uma breve explicação da importância jurídica/acadêmica.\n\n" +
                 "Use Markdown. Idioma: Português do Brasil.\n\n" +
                 "MATERIAL PARA PROCESSAR:\n\"\"\"\n" + contextText + "\n\"\"\""
    }

    const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + openAiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemRole },
          { role: "user", content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 2500,
      })
    })

    if (!aiResponse.ok) {
        const errJson = await aiResponse.text()
        console.error('OpenAI Action Err:', errJson)
        throw new Error('Erro na geração inteligente de conteúdo.')
    }

    const aiData = await aiResponse.json()
    const result = aiData.choices?.[0]?.message?.content || 'Não foi possível elaborar o conteúdo.'

    return new Response(JSON.stringify({ result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Erro em notebooklm-actions:', error.message)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
