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

    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .single()

    if (docError || !document) throw new Error('Documento não encontrado no banco de dados')

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

    await supabase.from('document_chunks').delete().eq('document_id', documentId)

    let successCount = 0
    let lastErrorDetails = ''

    for (const chunk of chunks) {
      const cleanChunk = chunk.trim()
      if (cleanChunk.length < 10) continue

      try {
        const embedResponse = await fetch('https://api.openai.com/v1/embeddings', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openAiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            input: cleanChunk,
            model: 'text-embedding-3-small'
          })
        })

        if (!embedResponse.ok) {
          const apiErr = await embedResponse.text()
          lastErrorDetails = `OpenAI recusou (Http ${embedResponse.status}): ${apiErr.substring(0, 100)}`
          continue
        }

        const embedResult = await embedResponse.json()
        const embedding = embedResult?.data?.[0]?.embedding
        
        if (!embedding) continue

        const { error: insertError } = await supabase.from('document_chunks').insert({
          document_id: documentId,
          content: cleanChunk,
          embedding: embedding,
          metadata: { name: document.name, type: fileExt, subject_id: document.subject_id }
        })

        if (insertError) {
          lastErrorDetails = `Erro DB: ${insertError.message}`
        } else {
          successCount++
        }
      } catch (chunkErr: any) {
         lastErrorDetails = `Loop Err: ${chunkErr?.message || '?'}`
      }
      
      await new Promise(r => setTimeout(r, 60)) // Tiny rate-limit delay
    }

    if (successCount === 0) {
      throw new Error(`0% retido. ${chunks.length} fragmentos negados. Erro: ${lastErrorDetails}`)
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