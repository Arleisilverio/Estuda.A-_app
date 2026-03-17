import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://qdbsdsnhygxlzrjmvhva.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFkYnNkc25oeWd4bHpyam12aHZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI0ODY5NzIsImV4cCI6MjA4ODA2Mjk3Mn0.m_kqvRXtlzH8Oqnz8GyJ8PTafXFOLSrNXknhiAVaowk'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function test() {
    const { data: sessionData, error: signInError } = await supabase.auth.signInWithPassword({
        email: 'arlei85@hotmail.com',
        password: 'agz4897'
    })

    if (signInError) {
        console.error('Login failed:', signInError.message)
        return
    }

    console.log('Login success as Admin.')

    // Try list users to see if it works
    console.log('Testing action: list')
    const { data: listData, error: listError } = await supabase.functions.invoke('user-management', {
        body: { action: 'list' }
    })
    
    if (listError) {
        console.error('List Error:', listError)
        if (listError.context) {
            console.error('List Context:', await listError.context.text?.() || listError.context)
        }
    } else {
        console.log('List Success:', listData?.users?.length, 'users.')
    }

    // Try a simulated delete on a fake user id to see the exact error it returns
    console.log('Testing action: delete (fake id)')
    const { error: delError } = await supabase.functions.invoke('user-management', {
        body: { action: 'delete', userId: 'fake-id' }
    })

    if (delError) {
        console.error('Delete Error:', delError)
        if (delError.context) {
            console.error('Delete Context:', await delError.context.text?.() || delError.context)
        }
    } else {
        console.log('Delete Success.')
    }
}

test()
