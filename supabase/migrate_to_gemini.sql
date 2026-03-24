-- MIGRATION TO GEMINI 1.5 EMBEDDINGS (768 Dimensions)
-- Execute este script no SQL Editor do seu projeto Supabase

-- 1. Alterar a coluna de embedding para 768 dimensões (padrão do Gemini text-embedding-004)
-- Atenção: Isso limpará os embeddings antigos da OpenAI (que tinham 1536 dimensões)
ALTER TABLE document_chunks ALTER COLUMN embedding TYPE vector(768);

-- 2. Recriar o índice HNSW para a nova dimensão
DROP INDEX IF EXISTS document_chunks_embedding_idx;
CREATE INDEX document_chunks_embedding_idx ON document_chunks 
USING hnsw (embedding vector_cosine_ops);

-- 3. Atualizar a função RPC match_document_chunks para aceitar vector(768)
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
    AND (filter_subject_id IS NULL OR dc.metadata->>'subject_id' = filter_subject_id)
  ORDER BY dc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- 4. Registrar que a migração foi concluída
COMMENT ON TABLE document_chunks IS 'Table updated to Gemini 768-dim embeddings';
