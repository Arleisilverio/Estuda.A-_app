import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://qdbsdsnhygxlzrjmvhva.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFkYnNkc25oeWd4bHpyam12aHZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI0ODY5NzIsImV4cCI6MjA4ODA2Mjk3Mn0.m_kqvRXtlzH8Oqnz8GyJ8PTafXFOLSrNXknhiAVaowk'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function testCascade() {
    const { data: session } = await supabase.auth.signInWithPassword({email: 'admin@estuda.com', password: 'admin123'})
    
    console.log("Inserindo matéria fake...");
    const { data: subject, error: e1 } = await supabase.from('subjects').insert({name: 'Matéria de Teste FK'}).select().single();
    if (e1) return console.log("Erro inserir matéria:", e1);
    
    console.log("Inserindo quiz fake...");
    const { error: e2 } = await supabase.from('quiz_history').insert({
        subject_id: subject.id,
        user_id: session.user.id,
        score: 10,
        total_questions: 5,
        quiz_data: {}
    });
    
    if (e2) {
        console.log("Erro inserir quiz (tabela quiz_history pode não existir ou faltar dados):", e2);
    } else {
        console.log("Quiz inserido com sucesso. Tabela tem FK!");
    }
    
    console.log("Tentando apagar matéria...");
    const { error: delErr } = await supabase.from('subjects').delete().eq('id', subject.id);
    if (delErr) {
        console.log("ERRO AO APAGAR MATÉRIA FK:");
        console.dir(delErr, { depth: null });
    } else {
        console.log("Matéria apagada COM SUCESSO! Não há erro de FK.");
    }
}
testCascade();
