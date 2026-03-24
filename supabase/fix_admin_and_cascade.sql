-- 1. Promover o email do Arlei a Administrador Oficial no Banco de Dados
-- Como a tabela 'profiles' não guarda o email diretamente, fazemos uma ponte com a tabela de autenticação (auth.users)
UPDATE public.profiles
SET user_role = 'admin'
FROM auth.users
WHERE auth.users.id = public.profiles.id
  AND auth.users.email = 'arlei85@hotmail.com';

-- 2. Garantir que tudo que depender de matérias seja excluído junto
ALTER TABLE IF EXISTS quiz_history
DROP CONSTRAINT IF EXISTS quiz_history_subject_id_fkey,
ADD CONSTRAINT quiz_history_subject_id_fkey
FOREIGN KEY (subject_id)
REFERENCES subjects(id)
ON DELETE CASCADE;
