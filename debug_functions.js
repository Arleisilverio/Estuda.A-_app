import { createClient } from '@supabase/supabase-js'
import fetch from 'node-fetch'
import dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = 'https://qdbsdsnhygxlzrjmvhva.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFkYnNkc25oeWd4bHpyam12aHZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI0ODY5NzIsImV4cCI6MjA4ODA2Mjk3Mn0.m_kqvRXtlzH8Oqnz8GyJ8PTafXFOLSrNXknhiAVaowk'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

const TEST_EMAIL = 'arlei85@hotmail.com'
const TEST_PASSWORD = 'agz4897'

async function runDiagnostics() {
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: TEST_EMAIL,
        password: TEST_PASSWORD
    })
    
    if (authError) {
        console.error('Login failed:', authError.message)
        return
    }

    const token = authData.session.access_token

    // Step 1: Find real IDs
    console.log('Fetching real data from DB...')
    const { data: subjects } = await supabase.from('subjects').select('id, name').limit(1)
    const { data: documents } = await supabase.from('documents').select('id, name, subject_id').limit(1)

    const subjectId = subjects?.[0]?.id 
    const documentId = documents?.[0]?.id

    console.log(`Using Subject ID: ${subjectId} (${subjects?.[0]?.name})`)
    console.log(`Using Document ID: ${documentId} (${documents?.[0]?.name})`)

    const functions = ['process-document', 'ask-ai', 'generate-quiz']
    
    for (const func of functions) {
        console.log(`\nTesting function: ${func}`)
        try {
            let body = {}
            if (func === 'ask-ai') {
                body = { query: 'Resuma o conteúdo disponível.', subjectId: subjectId }
            } else if (func === 'generate-quiz') {
                body = { subjectId: subjectId, count: 5 }
            } else {
                body = { documentId: documentId }
            }

            const res = await fetch(`${supabaseUrl}/functions/v1/${func}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(body)
            })

            console.log(`Status: ${res.status}`)
            const text = await res.text()
            try {
                const json = JSON.parse(text)
                console.log('Response:', JSON.stringify(json, null, 2))
            } catch {
                console.log('Response (text):', text.substring(0, 1000))
            }
        } catch (err) {
            console.error(`Error calling ${func}:`, err.message)
        }
    }
}

runDiagnostics()
