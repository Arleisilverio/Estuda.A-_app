import { createClient } from '@supabase/supabase-js'


const supabaseUrl = 'https://qdbsdsnhygxlzrjmvhva.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFkYnNkc25oeWd4bHpyam12aHZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI0ODY5NzIsImV4cCI6MjA4ODA2Mjk3Mn0.m_kqvRXtlzH8Oqnz8GyJ8PTafXFOLSrNXknhiAVaowk'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function test() {
    const { data: sessionData, error: signInError } = await supabase.auth.signInWithPassword({
        email: 'arlei85@hotmail.com',
        password: '123456' // Assuming this from typical testing
    })

    if (signInError) {
        console.log('Login failed:', signInError.message)
        return
    }

    const token = sessionData.session.access_token
    console.log('Got token.')

    // Test 1: fetch
    const res = await fetch(`${supabaseUrl}/functions/v1/process-document`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ documentId: 'test' })
    })

    console.log('Test 1 Fetch status:', res.status)
    if (res.status !== 200) {
        console.log('Test 1 Error:', await res.text())
    }

    // Test 2: invoke
    const { data, error } = await supabase.functions.invoke('process-document', {
        body: { documentId: 'test2' }
    })

    console.log('Test 2 Invoke error:', error?.context || error)
}

test()
