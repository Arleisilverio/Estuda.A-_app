-- 0. Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- 1. Ensure document_chunks has the correct vector dimension (1536 for text-embedding-3-small)
-- If your table already exists, you might need to run this cautiously or adjust:
-- ALTER TABLE document_chunks ALTER COLUMN embedding TYPE vector(1536);

-- 2. Create the HNSW index for faster vector similarity search
CREATE INDEX IF NOT EXISTS document_chunks_embedding_idx ON document_chunks 
USING hnsw (embedding vector_cosine_ops);

-- 3. Create or Update the matching function for RAG
CREATE OR REPLACE FUNCTION match_document_chunks (
  query_embedding vector(1536),
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
