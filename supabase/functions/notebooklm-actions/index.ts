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

    console.log('Realizando ação NotebookLM com Gemini:', action, 'Materia:', subjectId, 'Doc:', documentId || 'todos')

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

    if (docError) {
      console.error('Erro ao buscar chunks no banco:', docError.message)
      throw new Error('Erro ao buscar material no banco de dados: ' + docError.message)
    }

    const filteredChunks = chunks || []
    const contextText = filteredChunks.map((c: any) => c.content).join('\n\n')

    // Regra de Ouro: Se não há contexto, não há resposta da IA baseada em material
    if (!contextText || filteredChunks.length === 0) {
        return new Response(JSON.stringify({ 
            result: "📚 Nenhum material de estudo foi encontrado para esta matéria (ou arquivo). Por favor, certifique-se de que o material foi enviado e processado corretamente para que eu possa ajudar com resumos e guias." 
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
    }

    console.log(`Contexto carregado: ${filteredChunks.length} chunks, ação: ${action}`)

    let prompt = ""
    let systemRole = "Você é um assistente de estudo que opera em modo ESTRITO. Você DEVE basear suas respostas ÚNICA e EXCLUSIVAMENTE no material fornecido pelo professor abaixo. É TERMINANTEMENTE PROIBIDO usar conhecimento externo ou buscar informações na internet. Se o material não contiver a informação, diga que não foi possível encontrar no material."

    const sourceInfo = documentId ? "um MATERIAL ESPECÍFICO" : "os materiais da disciplina";

    if (action === 'summary') {
        prompt = `TAREFA: Gere um RESUMO ESTRUTURADO PREMIUM baseado em ${sourceInfo}.
        
REGRAS:
- Use tabelas ou tópicos para facilitar a leitura.
- Destaque termos técnicos em negrito.
- Mantenha a fidelidade total ao texto original.

FORMATO:
1. **📌 Resumo Executivo** (O que é mais importante)
2. **🔑 Tópicos Essenciais** (Detalhes fundamentais)
3. **💡 Insights do Material** (Conexões importantes identificadas no texto)

MATERIAL PARA ANALISAR:
"""
${contextText}
"""`
    } else if (action === 'guide') {
        prompt = `TAREFA: Crie um GUIA DE ESTUDO DINÂMICO baseado em ${sourceInfo}.

REGRAS:
- Transforme conceitos complexos em explicações simples (usando apenas o material).
- Crie um roteiro de estudo baseado no que está escrito.

FORMATO:
1. **📖 Terminologia Chave** (Definições encontradas no texto)
2. **🎯 Objetivos de Aprendizagem** (O que o aluno deve saber após ler este material)
3. **⚠️ Pontos de Atenção** (Alertas sobre conceitos cruciais do texto)

MATERIAL PARA ANALISAR:
"""
${contextText}
"""`
    } else if (action === 'citations') {
        prompt = `TAREFA: Extraia as 3 CITAÇÕES MAIS RELEVANTES de ${sourceInfo}.

REGRAS:
- A citação deve ser literal.
- Explique brevemente o contexto de cada citação dentro do material.

FORMATO POR CITAÇÃO:
> "Trecho literal do material..."
📌 **Contexto:** Explicação de onde e por que este trecho é relevante.

MATERIAL PARA ANALISAR:
"""
${contextText}
"""`
    } else {
        throw new Error(`Ação inválida: "${action}". Use: summary, guide ou citations.`)
    }

    // MODELO: gemini-2.5-flash
    const geminiModel = 'gemini-2.5-flash'
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${googleKey}`

    const aiResponse = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
            { role: "user", parts: [{ text: systemRole + "\n\n" + prompt }] }
        ],
        generationConfig: {
          temperature: 0.3, // Menor temperatura para maior fidelidade ao texto
        }
      })
    })

    if (!aiResponse.ok) {
        const errBody = await aiResponse.text()
        console.error(`Erro na API Gemini (${geminiModel}) - Status: ${aiResponse.status} - Body: ${errBody}`)
        throw new Error(`Erro na API Gemini (status ${aiResponse.status}): ${errBody.slice(0, 300)}`)
    }

    const aiData = await aiResponse.json()
    const result = aiData.candidates?.[0]?.content?.parts?.[0]?.text || 'Não foi possível extrair informações do material fornecido.'

    return new Response(JSON.stringify({ result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Erro em notebooklm-actions (Gemini):', error.message)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
