import fetch from 'node-fetch'
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

    const token = sessionData.session.access_token;

    console.log("---- TESTANDO ASK-AI ----")
    const res = await fetch(`${supabaseUrl}/functions/v1/ask-ai`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ message: "Olá IA", documentIds: [] })
    })

    console.log('Status ask-ai:', res.status)
    console.log('Body ask-ai:', await res.text())

    console.log("---- TESTANDO PROCESS-DOCUMENT ----")
    const res2 = await fetch(`${supabaseUrl}/functions/v1/process-document`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ documentId: "fake-id-123" })
    })
    console.log('Status process:', res2.status)
    console.log('Body process:', await res2.text())
}

test()
