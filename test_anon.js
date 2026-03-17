import fetch from 'node-fetch'

const supabaseUrl = 'https://qdbsdsnhygxlzrjmvhva.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFkYnNkc25oeWd4bHpyam12aHZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI0ODY5NzIsImV4cCI6MjA4ODA2Mjk3Mn0.m_kqvRXtlzH8Oqnz8GyJ8PTafXFOLSrNXknhiAVaowk'

async function checkAnon() {
    console.log("Testing with ANON KEY")
    const res = await fetch(`${supabaseUrl}/functions/v1/user-management`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${supabaseAnonKey}`
        }
    })
    console.log('user-management anon status:', res.status)
    const text = await res.text();
    console.log('user-management anon body:', text)
}

checkAnon()
