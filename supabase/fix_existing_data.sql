-- 1. Atualizar todos os chunks existentes com o subject_id correto
-- Isso garante que materiais antigos voltem a funcionar com a nova filtragem.

UPDATE document_chunks dc
SET metadata = dc.metadata || jsonb_build_object('subject_id', d.subject_id::text)
FROM documents d
WHERE dc.document_id = d.id
AND (dc.metadata->>'subject_id' IS NULL);

-- 2. Garantir que o RPC esteja com a versão final correta
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
