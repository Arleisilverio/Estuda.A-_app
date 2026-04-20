-- ==========================================
-- SCRIPT PARA CORRIGIR O UPLOAD DE MATERIAIS
-- ==========================================

-- 1. Políticas para a tabela 'documents'
-- Garante que a tabela tenha RLS ativado
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- Permite que usuários logados vejam os documentos
DROP POLICY IF EXISTS "Allow select for authenticated" ON public.documents;
CREATE POLICY "Allow select for authenticated" ON public.documents
FOR SELECT TO authenticated USING (true);

-- Permite que professores logados insiram documentos
DROP POLICY IF EXISTS "Allow insert for authenticated" ON public.documents;
CREATE POLICY "Allow insert for authenticated" ON public.documents
FOR INSERT TO authenticated WITH CHECK (true);

-- Permite que professores deletem seus documentos
DROP POLICY IF EXISTS "Allow delete for authenticated" ON public.documents;
CREATE POLICY "Allow delete for authenticated" ON public.documents
FOR DELETE TO authenticated USING (true);

-- Permite que professores atualizem documentos
DROP POLICY IF EXISTS "Allow update for authenticated" ON public.documents;
CREATE POLICY "Allow update for authenticated" ON public.documents
FOR UPDATE TO authenticated USING (true);


-- 2. Configurações e Políticas para o Storage (Bucket 'documents')
-- Cria o bucket se ele não existir
INSERT INTO storage.buckets (id, name, public) 
VALUES ('documents', 'documents', true)
ON CONFLICT (id) DO NOTHING;

-- Permite que usuários autenticados façam upload de arquivos para o bucket
DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
CREATE POLICY "Allow authenticated uploads" ON storage.objects
FOR INSERT TO authenticated WITH CHECK (bucket_id = 'documents');

-- Permite que qualquer um leia os arquivos (ou ajuste para "TO authenticated" se for privado)
DROP POLICY IF EXISTS "Allow public read access" ON storage.objects;
CREATE POLICY "Allow public read access" ON storage.objects
FOR SELECT TO public USING (bucket_id = 'documents');

-- Permite exclusão de arquivos no storage
DROP POLICY IF EXISTS "Allow authenticated deletes" ON storage.objects;
CREATE POLICY "Allow authenticated deletes" ON storage.objects
FOR DELETE TO authenticated USING (bucket_id = 'documents');

-- Permite atualização de arquivos no storage
DROP POLICY IF EXISTS "Allow authenticated updates" ON storage.objects;
CREATE POLICY "Allow authenticated updates" ON storage.objects
FOR UPDATE TO authenticated USING (bucket_id = 'documents');
