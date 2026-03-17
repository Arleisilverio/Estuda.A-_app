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

    console.log('Realizando ação NotebookLM:', action, 'Materia:', subjectId)

    // 1. Buscar conteúdo de estudo (chunks)
    let query = supabase
       .from('document_chunks')
       .select('content, metadata, document_id')
       .limit(50)
       
    if (documentId) {
       query = query.eq('document_id', documentId)
    }

    const { data: chunks, error: docError } = await query
    
    // Filtro adicional por subjectId (metadados com subject_id)
    const filteredChunks = documentId ? (chunks || []) : (chunks?.filter((c: any) => {
        return !c.metadata?.subject_id || c.metadata.subject_id === subjectId
    }) || [])
    
    const contextText = filteredChunks.map((c: any) => c.content).join('\n\n')

    if (!contextText || filteredChunks.length === 0) {
        throw new Error('Nenhum material encontrado para processar esta ação.')
    }

    let prompt = ""
    let systemRole = "Você é um assistente de estudo experiente, no estilo do NotebookLM da Google."

    if (action === 'summary') {
        prompt = "ESTREITA TAREFA: Crie um RESUMO ESTRUTURADO de alta qualidade do material de estudo fornecido.\n" +
                 "O resumo deve seguir este formato:\n" +
                 "1. **Visão Geral**: Um parágrafo resumindo o objetivo principal do texto.\n" +
                 "2. **Pontos-Chave**: Uma lista com marcadores dos conceitos mais importantes.\n" +
                 "3. **Conclusão**: O takeaway final.\n\n" +
                 "Use Markdown rico (negrito, listas). Idioma: Português do Brasil.\n\n" +
                 "MATERIAL:\n\"\"\"\n" + contextText + "\n\"\"\""
    } else if (action === 'guide') {
        prompt = "ESTREITA TAREFA: Crie um GUIA DE ESTUDO COMPLETO baseado no material fornecido.\n" +
                 "O guia deve conter:\n" +
                 "1. **Glossário**: Definição de 3 a 5 termos técnicos ou complexos presentes no texto.\n" +
                 "2. **Perguntas de Fixação**: 3 perguntas abertas para o aluno testar seu próprio conhecimento.\n" +
                 "3. **Checklist de Estudo**: O que o aluno deve dominar após ler este material.\n\n" +
                 "Use Markdown. Idioma: Português do Brasil.\n\n" +
                 "MATERIAL:\n\"\"\"\n" + contextText + "\n\"\"\""
    } else if (action === 'citations') {
        prompt = "ESTREITA TAREFA: Extraia as 3 CITAÇÕES DIRETAS mais impactantes do material.\n" +
                 "Para cada citação:\n" +
                 "1. O texto original entre aspas.\n" +
                 "2. Uma breve explicação (1 frase) do porquê essa citação é fundamental.\n\n" +
                 "Use Markdown. Idioma: Português do Brasil.\n\n" +
                 "MATERIAL:\n\"\"\"\n" + contextText + "\n\"\"\""
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
        temperature: 0.5,
      })
    })

    if (!aiResponse.ok) {
        throw new Error('Erro na OpenAI API: ' + (await aiResponse.text()))
    }

    const aiData = await aiResponse.json()
    const result = aiData.choices?.[0]?.message?.content || 'Não foi possível gerar o conteúdo.'

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
