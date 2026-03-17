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
    const { subjectId, subjectName, documentId } = await req.json()

    // Validação básica
    if (!subjectId) throw new Error('O ID da matéria (subjectId) é obrigatório')

    const openAiKey = Deno.env.get('OPENAI_API_KEY') || Deno.env.get('openai-api-key') || Deno.env.get('Openai_api_key') || Deno.env.get('openai_api_key')
    if (!openAiKey) throw new Error('A chave da OpenAI não foi encontrada nas secrets do Supabase')

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log(`Gerando quiz para a matéria: ${subjectId} / Filtro Documento: ${documentId || 'Todos'}`)

    // 1. Buscar conteúdo de estudo (chunks)
    let query = supabase
       .from('document_chunks')
       .select('content, document_id, metadata')
       .limit(150) // pegar uma boa qtde pra ter variedade
       
    // Se enviou o ID de 1 PDF para focar a prova apenas nele:
    if (documentId) {
       query = query.eq('document_id', documentId)
    }

    const { data: documents, error: docError } = await query

    // Filtro adicional de segurança por subjectId se não enviou documento específico
    const filteredDocs = documentId ? (documents || []) : (documents?.filter((d: any) => {
       return !d.metadata?.subject_id || d.metadata.subject_id === subjectId
    }) || [])

    // Embaralhar e pegar alguns aleatórios para n gerar sempre o msmo quiz
    const shuffled = filteredDocs.sort(() => 0.5 - Math.random())
    const selectedDocs = shuffled.slice(0, 15) // limite de chunks no prompt
    
    let contextText = selectedDocs.map((doc: any) => doc.content).join('\n\n')
    let basedOnMaterials = true

    if (!contextText || filteredDocs.length === 0) {
      console.log(`Nenhum fragmento encontrado para a matéria ${subjectId}.`)
      contextText = `Nenhum material de apoio foi encontrado no sistema ou arquivou falhou no processamento. Você TEM QUE GERAR as perguntas unicamente com base no seu conhecimento geral avançado e acadêmico sobre a matéria: "${subjectName || 'Assuntos Acadêmicos'}"`
      basedOnMaterials = false
    }

    // 3. Formatar o prompt para o OpenAI pedindo JSON estruturado
    const promptStr = `Você é um Criador de Quizzes educacionais focado em provas acadêmicas.
A matéria alvo desta avaliação é: ${subjectName || 'Assunto Principal'}.

Sua tarefa OBRIGATÓRIA é criar EXATAMENTE 10 QUESTÕES de múltipla escolha baseadas EXCLUSIVAMENTE nos Materiais de Estudo fornecidos abaixo (se houverem).

REGRAS ESTANQUES:
1. Sempre 10 questões, nunca menos, nunca mais.
2. Todas as questões e os textos devem estar em Português do Brasil.
3. Cada questão deve ter 4 alternativas claras ("options") que façam sentido, não faça óbvias demais.
4. Apenas UMA alternativa deve estar correta.
5. Você FOI OBRIGADO a incluir o campo "explanation" em TODA QUESTÃO. Este campo servirá como a explicação do gabarito (o porquê a resposta "answer" é a correta) para quando o aluno errar ele aprender, seja detalhista na explicação.

O formato final DEVE obrigatoriamente ser um JSON válido contendo a raiz "questions":
{
  "questions": [
    {
      "question": "Texto da sua pergunta inteligente?",
      "options": ["Opção A", "Opção B", "Opção C", "Opção D"],
      "answer": "Opção B",
      "explanation": "A Opção B é correta porque no contexto o autor defende que..."
    }
  ]
}

MATERIAIS DE ESTUDO ENCONTRADOS NO PDF DO ALUNO (Use-os pesadamente):
"""
${contextText}
"""`

    // 4. Chamar a OpenAI (Usamos o O1 ou o gpt-4o para provas mais robustas?)
    // O gpt-4o-mini já manda muito bem nisto e responde mais rapido pro frontend
    const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "system", content: promptStr }],
        temperature: 0.6, // leve flexibilidade
        response_format: { type: "json_object" }
      })
    })

    if (!aiResponse.ok) {
        throw new Error(`Erro na OpenAI API: ${await aiResponse.text()}`)
    }

    const aiData = await aiResponse.json()
    const jsonString = aiData.choices?.[0]?.message?.content || '{"questions":[]}'
    
    let parsedData
    try {
        parsedData = JSON.parse(jsonString)
    } catch(e) {
        throw new Error("Erro de formatação na resposta (JSON parse failed).")
    }

    let questionsList = parsedData.questions || []

    // Validação das questões geradas (Forçando 10 max se vieram 11)
    if (questionsList.length === 0) {
        throw new Error("A Inteligência Artificial não retornou as perguntas solicitadas.")
    }
    
    if (questionsList.length > 10) {
        questionsList = questionsList.slice(0, 10);
    }

    // 5. Retornar
    return new Response(JSON.stringify({
      questions: questionsList,
      basedOnMaterials: basedOnMaterials
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Erro na geração do quiz (generate-quiz):', error.message)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})