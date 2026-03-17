import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://qdbsdsnhygxlzrjmvhva.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFkYnNkc25oeWd4bHpyam12aHZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI0ODY5NzIsImV4cCI6MjA4ODA2Mjk3Mn0.m_kqvRXtlzH8Oqnz8GyJ8PTafXFOLSrNXknhiAVaowk'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function test() {
    const { data: sessionData, error: signInError } = await supabase.auth.signInWithPassword({
        email: 'arlei85@hotmail.com',
        password: 'agz4897'
    })

    if (signInError) return console.log('Login falhou:', signInError);

    console.log("Chamando a RPC SQL para deletar conta...");
    const { data, error } = await supabase.rpc('delete_user_account', {
        user_id_to_delete: sessionData.session.user.id
    })

    console.log("Erro da RPC:", error);
    console.log("Resultado da RPC:", data);
}

test()
