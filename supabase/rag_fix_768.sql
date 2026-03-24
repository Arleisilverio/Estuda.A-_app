-- ============================================================
-- ESTUDA AÍ - RAG FIX: Corrige dimensão dos vetores (1536 → 768)
-- Execute este script no painel SQL do Supabase
-- ============================================================

-- 1. Remover a função antiga (com vector(1536))
DROP FUNCTION IF EXISTS match_document_chunks(vector, float, int, text);

-- 2. Recriar a coluna embedding com a dimensão correta (768, igual ao gemini-embedding-001)
--    ATENÇÃO: Isso vai apagar os dados de embedding existentes. Reprocesse os documentos depois.
ALTER TABLE document_chunks DROP COLUMN IF EXISTS embedding;
ALTER TABLE document_chunks ADD COLUMN embedding vector(768);

-- 3. Recriar o index HNSW para a nova dimensão
DROP INDEX IF EXISTS document_chunks_embedding_idx;
CREATE INDEX document_chunks_embedding_idx ON document_chunks
USING hnsw (embedding vector_cosine_ops);

-- 4. Recriar a função match_document_chunks com vector(768)
CREATE OR REPLACE FUNCTION match_document_chunks (
  query_embedding vector(768),
  match_threshold float,
  match_count int,
  filter_subject_id text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  document_id uuid,
  content text,
  metadata jsonb,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    dc.id,
    dc.document_id,
    dc.content,
    dc.metadata,
    1 - (dc.embedding <=> query_embedding) AS similarity
  FROM document_chunks dc
  WHERE 1 - (dc.embedding <=> query_embedding) > match_threshold
    AND (
      filter_subject_id IS NULL
      OR dc.metadata->>'subject_id' = filter_subject_id
      OR dc.metadata->>'subject_id' = filter_subject_id::text
    )
  ORDER BY dc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- ============================================================
-- VERIFICAÇÃO: rode após executar para confirmar
-- SELECT COUNT(*) FROM document_chunks;
-- SELECT * FROM match_document_chunks(array_fill(0::float8, ARRAY[768])::vector(768), 0.0, 5, NULL);
-- ============================================================
