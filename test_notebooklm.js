import { createClient } from '@supabase/supabase-js'
import fetch from 'node-fetch'
import dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = 'https://qdbsdsnhygxlzrjmvhva.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFkYnNkc25oeWd4bHpyam12aHZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI0ODY5NzIsImV4cCI6MjA4ODA2Mjk3Mn0.m_kqvRXtlzH8Oqnz8GyJ8PTafXFOLSrNXknhiAVaowk'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

const TEST_EMAIL = 'arlei85@hotmail.com'
const TEST_PASSWORD = 'agz4897'

async function testNotebookLMAction() {
    const { data: authData } = await supabase.auth.signInWithPassword({
        email: TEST_EMAIL,
        password: TEST_PASSWORD
    })
    
    const token = authData.session.access_token
    const { data: subjects } = await supabase.from('subjects').select('id').limit(1)
    const subjectId = subjects?.[0]?.id

    console.log(`Testing notebooklm-actions for subject: ${subjectId}`)

    const res = await fetch(`${supabaseUrl}/functions/v1/notebooklm-actions`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
            action: 'summary',
            subjectId: subjectId
        })
    })

    console.log(`Status: ${res.status}`)
    const text = await res.text()
    console.log('Response:', text)
}

testNotebookLMAction()
