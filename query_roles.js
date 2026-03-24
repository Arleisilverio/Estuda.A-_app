import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://qdbsdsnhygxlzrjmvhva.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFkYnNkc25oeWd4bHpyam12aHZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI0ODY5NzIsImV4cCI6MjA4ODA2Mjk3Mn0.m_kqvRXtlzH8Oqnz8GyJ8PTafXFOLSrNXknhiAVaowk'

// Para rodar SQL nativo precisamos passar a service_role_key. A API padrão nao expõe a tabela pg_policies.
// No entanto, podemos apenas checar as roles de 'arlei85@hotmail.com' e 'admin@estuda.com'
const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function checkRoles() {
    console.log("Checando profiles:");
    const { data: p1 } = await supabase.from('profiles').select('*').in('email', ['arlei85@hotmail.com', 'admin@estuda.com']);
    console.log("Perfis retornados (usando chave anonima pode estar bloqueado):", p1);
}
checkRoles();
