import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.6"
import pdf from "npm:pdf-parse@1.1.1"
import { Buffer } from "node:buffer"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    const documentId = body.documentId

    if (!documentId) throw new Error('Parâmetro documentId não fornecido')

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const openAiKey = Deno.env.get('OPENAI_API_KEY') || Deno.env.get('openai-api-key') || Deno.env.get('Openai_api_key') || Deno.env.get('openai_api_key')
    if (!openAiKey) throw new Error('A chave da OpenAI (OPENAI_API_KEY) não está configurada nas variáveis de ambiente')
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

    // Função auxiliar para tentar buscar o documento com retry (evita race condition)
    const getDocumentWithRetry = async (id: string, retries = 3) => {
      for (let i = 0; i < retries; i++) {
        const { data, error } = await supabase
          .from('documents')
          .select('*')
          .eq('id', id)
          .single()
        
        if (data) return { data, error: null }
        if (i < retries - 1) {
          console.log(`Tentativa ${i + 1} falhou, aguardando 1s...`)
          await new Promise(resolve => setTimeout(resolve, 1000))
        }
      }
      return { data: null, error: new Error('Documento não encontrado após várias tentativas') }
    }

    const { data: document, error: docError } = await getDocumentWithRetry(documentId)

    if (docError || !document) throw new Error(docError?.message || 'Documento não encontrado no banco de dados')

    const { data: fileBlob, error: downloadError } = await supabase.storage
      .from('documents')
      .download(document.file_path)

    if (downloadError) throw new Error('Falha ao baixar do Storage: ' + downloadError.message)

    const arrayBuffer = await fileBlob.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const fileExt = document.name?.split('.').pop()?.toLowerCase() || ''

    let textContent = ''

    if (fileExt === 'txt' || fileExt === 'csv' || fileExt === 'md' || fileExt === 'json') {
      textContent = new TextDecoder().decode(arrayBuffer)
    } else if (fileExt === 'rtf') {
      const rawText = new TextDecoder().decode(arrayBuffer)
      textContent = rawText
            .replace(/\{\\*?\\[^{}]+}/gi, '')
            .replace(/\{\\[a-z]+\d?[ ]/gi, '')
            .replace(/\\[a-z]+\d* ?/gi, ' ')
            .replace(/\\'([0-9a-fA-F]{2})/gi, '')
            .replace(/\\[^a-z]/gi, '')
            .replace(/[{}]/g, '')
            .replace(/\s+/g, ' ')
            .trim()
    } else if (fileExt === 'pdf') {
      try {
        const pdfData = await pdf(buffer)
        textContent = pdfData.text
      } catch (err: any) {
        throw new Error('Falha do pdf-parse: ' + (err?.message || 'Desconhecido'))
      }
    } else {
      throw new Error(`formato .${fileExt} não suportado.`)
    }

    if (!textContent || textContent.trim().length < 15) {
      throw new Error(`Texto extraído está vazio ou ilegível (Tamanho: ${textContent?.length || 0})`)
    }

    console.log(`Extração OK: ${textContent.length} caracteres para formato .${fileExt}`)

    // Limpeza Mínima Rápida (substitui a limpeza pesada anterior que causava CPU Timeout de 9s no Deno)
    // Remove apenas bytes Nulos e quebras invisiveis
    let safeText = textContent.replace(/\0/g, '')
    // Somente para RTF que pode ter lixo bizarro rodamos um sanitizador manual por linha pra evitar Crash Regex
    if (fileExt === 'rtf') {
        safeText = safeText.replace(/[^\x20-\x7E\xA0-\xFF\n]/g, ' ')
    }

    const paragraphs = safeText.split(/\n\n+/).filter(p => p.trim().length > 20)
    const chunks: string[] = []

    for (const para of paragraphs) {
      if (para.length <= 1000) {
        chunks.push(para.trim())
      } else {
        const sentences = para.match(/[^.!?]+[.!?]+/g) || [para]
        let currentChunk = ''
        for (const sentence of sentences) {
          if ((currentChunk + sentence).length > 1000) {
            if (currentChunk) chunks.push(currentChunk.trim())
            currentChunk = sentence
          } else {
            currentChunk += ' ' + sentence
          }
        }
        if (currentChunk.trim()) chunks.push(currentChunk.trim())
      }
    }

    if (chunks.length === 0) {
      const raw = safeText.trim()
      for (let i = 0; i < raw.length; i += 800) {
        chunks.push(raw.slice(i, i + 800))
      }
    }

    // Batch processing
    await supabase.from('document_chunks').delete().eq('document_id', documentId)

    const BATCH_SIZE = 10
    let successCount = 0

    for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
      const batchChunks = chunks.slice(i, i + BATCH_SIZE).map(c => c.trim()).filter(c => c.length > 5)
      if (batchChunks.length === 0) continue

      try {
        const embedResponse = await fetch('https://api.openai.com/v1/embeddings', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openAiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            input: batchChunks,
            model: 'text-embedding-3-small'
          })
        })

        if (!embedResponse.ok) {
          const apiErr = await embedResponse.text()
          console.error(`OpenAI error (Batch ${i}):`, apiErr)
          continue
        }

        const embedResult = await embedResponse.json()
        const embeddings = embedResult?.data?.map((d: any) => d.embedding)

        if (embeddings && embeddings.length === batchChunks.length) {
          const insertData = batchChunks.map((chunk, idx) => ({
            document_id: documentId,
            content: chunk,
            embedding: embeddings[idx],
            metadata: { 
              name: document.name, 
              type: fileExt, 
              subject_id: document.subject_id,
              processed_at: new Date().toISOString()
            }
          }))

          const { error: insertError } = await supabase.from('document_chunks').insert(insertData)

          if (insertError) {
            console.error(`DB Insert Error (Batch ${i}):`, insertError.message)
          } else {
            successCount += batchChunks.length
          }
        }
      } catch (err: any) {
        console.error(`Batch ${i} fatal error:`, err?.message)
      }
    }

    if (successCount === 0 && chunks.length > 0) {
      throw new Error(`Falha ao processar embeddings. Verifique as chaves de API e limites.`)
    }

    await supabase.from('documents').update({ status: 'ready' }).eq('id', documentId)

    return new Response(JSON.stringify({ success: true, chunks: successCount }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error: any) {
    console.error('Edge Function Fatal Crash:', error?.message)
    return new Response(JSON.stringify({ error: error?.message || 'Erro Server-Side' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})