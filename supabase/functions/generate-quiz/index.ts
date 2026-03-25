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
    const { subjectId: rawSubjectId, subjectName, documentId } = await req.json()
    const subjectId = rawSubjectId?.toString() // metadados salvos como string no JSON

    if (!subjectId) throw new Error('O ID da matéria (subjectId) é obrigatório')

    const googleKey = Deno.env.get('GOOGLE_API_KEY') || Deno.env.get('google_api_key') || Deno.env.get('Google_api_key')
    if (!googleKey) throw new Error('A chave do Google (Gemini) não foi encontrada nas secrets do Supabase')

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log(`Gerando quiz Gemini para a matéria: ${subjectId} / Filtro Documento: ${documentId || 'Todos'}`)

    // 1. Buscar conteúdo de estudo (chunks)
    let queryBuilder = supabase
       .from('document_chunks')
       .select('content, document_id, metadata')
       
    if (documentId) {
       queryBuilder = queryBuilder.eq('document_id', documentId)
    } else {
       queryBuilder = queryBuilder.filter('metadata->>subject_id', 'eq', subjectId)
    }

    const { data: documents, error: docError } = await queryBuilder.limit(50)

    const filteredDocs = documents || []
    const shuffled = [...filteredDocs].sort(() => 0.5 - Math.random())
    const selectedDocs = shuffled.slice(0, 15) 
    
    let contextText = selectedDocs.map((doc: any) => doc.content).join('\n\n')
    let basedOnMaterials = true

    if (!contextText || filteredDocs.length === 0) {
      console.log(`Nenhum fragmento encontrado para a matéria ${subjectId}. Usando conhecimento geral.`)
      contextText = `Nenhum material de apoio foi encontrado no sistema. Gere as perguntas com base no seu conhecimento acadêmico sobre: "${subjectName || 'Matéria Acadêmica'}"`
      basedOnMaterials = false
    }

    // 2. Formatar o prompt para o Gemini pedindo JSON estruturado
    const sourceInfo = documentId ? "um MATERIAL ESPECÍFICO do professor" : "TODOS os materiais disponíveis da disciplina";
    
    const promptStr = `Você é um Criador de Quizzes educacionais premium para o app Estuda.AÍ.
A matéria alvo desta avaliação é: ${subjectName || 'Assunto Principal'}.
VOCÊ ESTÁ USANDO COMO BASE: ${sourceInfo}.

Sua tarefa OBRIGATÓRIA é criar EXATAMENTE 10 QUESTÕES de múltipla escolha baseadas EXCLUSIVAMENTE nos Materiais de Estudo fornecidos abaixo. 
Se o material for insuficiente, use seu conhecimento acadêmico apenas para complementar a didática, mantendo a fidelidade ao conteúdo original.

REGRAS:
1. Sempre 10 questões.
2. Idioma: Português do Brasil.
3. Cada questão deve ter 4 alternativas (options): A, B, C, D como textos completos (não apenas letras).
4. Apenas UMA alternativa correta (answer) — deve ser o TEXTO COMPLETO da alternativa correta.
5. Inclua o campo "explanation" com a justificativa técnica/didática completa da resposta correta.

O formato final DEVE obrigatoriamente ser um JSON válido contendo a raiz "questions":
{
  "questions": [
    {
      "question": "Texto da sua pergunta?",
      "options": ["Texto completo da opção A", "Texto completo da opção B", "Texto completo da opção C", "Texto completo da opção D"],
      "answer": "Texto completo da opção correta (deve ser idêntico a um dos options)",
      "explanation": "Explicação detalhada e didática da resposta correta baseada no material..."
    }
  ]
}

MATERIAIS DE APOIO (CONHECIMENTO RAG):
"""
${contextText}
"""`

    // CORREÇÃO: usar gemini-1.5-flash (estável e disponível na API pública)
    const geminiModel = 'gemini-1.5-flash'
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${googleKey}`

    const aiResponse = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: promptStr }] }],
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.6,
        }
      })
    })

    if (!aiResponse.ok) {
        const errBody = await aiResponse.text()
        console.error(`Erro na API Gemini (${geminiModel}) - Status: ${aiResponse.status} - Body: ${errBody}`)
        throw new Error(`Erro na API Gemini (status ${aiResponse.status}): ${errBody.slice(0, 300)}`)
    }

    const aiData = await aiResponse.json()
    const jsonString = aiData.candidates?.[0]?.content?.parts?.[0]?.text || '{"questions":[]}'
    
    let parsedData
    try {
        parsedData = JSON.parse(jsonString)
    } catch(e) {
        console.error('Falha ao parsear JSON do Gemini. Resposta bruta:', jsonString.slice(0, 500))
        throw new Error("Erro de formatação na resposta do Gemini (JSON fail).")
    }

    let questionsList = parsedData.questions || []
    if (questionsList.length === 0) {
        throw new Error("A Inteligência Artificial não retornou as perguntas solicitadas.")
    }
    
    if (questionsList.length > 10) questionsList = questionsList.slice(0, 10);

    return new Response(JSON.stringify({
      questions: questionsList,
      basedOnMaterials: basedOnMaterials
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Erro na geração do quiz (Gemini):', error.message)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})