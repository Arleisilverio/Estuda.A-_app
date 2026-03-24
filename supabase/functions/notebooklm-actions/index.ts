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

    const googleKey = Deno.env.get('GOOGLE_API_KEY') || Deno.env.get('google_api_key') || Deno.env.get('Google_api_key')
    if (!googleKey) throw new Error('A chave do Google (Gemini) não foi encontrada nas secrets do Supabase')

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log('Realizando ação NotebookLM com Gemini:', action, 'Materia:', subjectId)

    // 1. Buscar conteúdo de estudo (chunks)
    let queryBuilder = supabase
       .from('document_chunks')
       .select('content, metadata, document_id')
       
    if (documentId) {
       queryBuilder = queryBuilder.eq('document_id', documentId)
    } else {
       queryBuilder = queryBuilder.filter('metadata->>subject_id', 'eq', subjectId)
    }

    const { data: chunks, error: docError } = await queryBuilder.limit(80)
    const filteredChunks = chunks || []
    const contextText = filteredChunks.map((c: any) => c.content).join('\n\n')

    if (!contextText || filteredChunks.length === 0) {
        if (action === 'summary' || action === 'guide' || action === 'citations') {
             throw new Error('Nenhum material encontrado para processar no Gemini.')
        }
    }

    let prompt = ""
    let systemRole = "Você é um assistente de estudo inteligente, especialista em transformar materiais densos em conteúdos didáticos (estilo NotebookLM)."

    const sourceInfo = documentId ? "um MATERIAL ESPECÍFICO do professor" : "TODOS os materiais disponíveis da disciplina";

    if (action === 'summary') {
        prompt = `TAREFA: Gere um RESUMO ESTRUTURADO PREMIUM.
VOCÊ ESTÁ USANDO COMO BASE: ${sourceInfo}.

FORMATO:
1. **Resumo Executivo**
2. **Tópicos Essenciais**
3. **Insights Acadêmicos**

MATERIAL PARA ANALISAR:
"""
${contextText}
"""`
    } else if (action === 'guide') {
        prompt = `TAREFA: Crie um GUIA DE ESTUDO COMPACTO.
VOCÊ ESTÁ USANDO COMO BASE: ${sourceInfo}.

FORMATO:
1. **Terminologia Chave**
2. **Desafio Rápido (3 questões)**
3. **Dica de Especialista**

MATERIAL PARA ANALISAR:
"""
${contextText}
"""`
    } else if (action === 'citations') {
        prompt = `TAREFA: Extraia 3 CITAÇÕES RELEVANTES do material abaixo.
VOCÊ ESTÁ USANDO COMO BASE: ${sourceInfo}.

MATERIAL:
"""
${contextText}
"""`
    }

    const aiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${googleKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
            { role: "user", parts: [{ text: systemRole + "\n\n" + prompt }] }
        ],
        generationConfig: {
          temperature: 0.7,
        }
      })
    })

    if (!aiResponse.ok) {
        throw new Error('Erro na geração inteligente de conteúdo Gemini.')
    }

    const aiData = await aiResponse.json()
    const result = aiData.candidates?.[0]?.content?.parts?.[0]?.text || 'Não foi possível elaborar o conteúdo.'

    return new Response(JSON.stringify({ result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Erro em notebooklm-actions (Gemini):', error.message)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
