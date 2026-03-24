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

    const googleKey = Deno.env.get('GOOGLE_API_KEY') || Deno.env.get('google_api_key') || Deno.env.get('Google_api_key')
    if (!googleKey) throw new Error('A chave do Google (Gemini) não está configurada nas secrets do Supabase')

    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .single()

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
      throw new Error(`Texto extraído está vazio ou ilegível.`)
    }

    console.log(`Processando documento com Gemini 1.5: ${textContent.length} caracteres`)

    // Chunks
    const paragraphs = textContent.replace(/\0/g, '').split(/\n\n+/).filter(p => p.trim().length > 20)
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
      const raw = textContent.trim()
      for (let i = 0; i < raw.length; i += 800) {
        chunks.push(raw.slice(i, i + 800))
      }
    }

    // Limpar chunks antigos
    await supabase.from('document_chunks').delete().eq('document_id', documentId)

    const BATCH_SIZE = 1 // Gemini batch embeddings is slightly different, let's process one by one or use batchContent
    let successCount = 0

    // Google Gemini gemini-embedding-001 (reduzido para 768 para compatibilidade PGVector)
    for (const chunkText of chunks) {
      try {
        const embedResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${googleKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
             content: { parts: [{ text: chunkText }] },
             outputDimensionality: 768
          })
        })

        if (!embedResponse.ok) continue

        const embedResult = await embedResponse.json()
        const embedding = embedResult?.embedding?.values

        if (embedding && embedding.length === 768) {
          const { error: insertError } = await supabase.from('document_chunks').insert({
            document_id: documentId,
            content: chunkText,
            embedding: embedding,
            metadata: { 
              name: document.name, 
              type: fileExt, 
              subject_id: document.subject_id,
              processed_at: new Date().toISOString()
            }
          })

          if (!insertError) successCount++
        }
      } catch (err: any) {
        console.error(`Chunk error:`, err?.message)
      }
    }

    if (successCount === 0 && chunks.length > 0) {
      throw new Error(`Falha ao processar embeddings com Gemini.`)
    }

    await supabase.from('documents').update({ status: 'ready' }).eq('id', documentId)

    return new Response(JSON.stringify({ success: true, chunks: successCount }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error: any) {
    console.error('Edge Function Fatal Crash (Gemini Process):', error?.message)
    return new Response(JSON.stringify({ error: error?.message || 'Erro Server-Side' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})