import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = 'https://qdbsdsnhygxlzrjmvhva.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFkYnNkc25oeWd4bHpyam12aHZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI0ODY5NzIsImV4cCI6MjA4ODA2Mjk3Mn0.m_kqvRXtlzH8Oqnz8GyJ8PTafXFOLSrNXknhiAVaowk'

const TEST_EMAIL = 'arlei85@hotmail.com'
const TEST_PASSWORD = 'agz4897'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function checkCounts() {
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: TEST_EMAIL,
        password: TEST_PASSWORD
    })

    if (authError) {
        console.error('Auth Error:', authError.message)
        return
    }

    console.log(`Logged in as: ${TEST_EMAIL}`)

    const { count: docsCount, error: docsError } = await supabase.from('documents').select('*', { count: 'exact', head: true })
    const { count: chunksCount, error: chunksError } = await supabase.from('document_chunks').select('*', { count: 'exact', head: true })
    const { count: subjectsCount, error: subjectsError } = await supabase.from('subjects').select('*', { count: 'exact', head: true })

    console.log('--- Database Stats ---')
    console.log(`Subjects: ${subjectsCount} (Error: ${subjectsError?.message || 'none'})`)
    console.log(`Documents: ${docsCount} (Error: ${docsError?.message || 'none'})`)
    console.log(`Document Chunks: ${chunksCount} (Error: ${chunksError?.message || 'none'})`)

    const { data: subjects } = await supabase.from('subjects').select('*')
    console.log('\n--- Subjects ---')
    console.table(subjects)

    const { data: documentsWithSubjects } = await supabase.from('documents').select('id, name, subject_id, status')
    console.log('\n--- Documents with Subject IDs ---')
    console.table(documentsWithSubjects)

    // Check chunks for the subject
    if (subjects && subjects.length > 0) {
        const testSubjectId = '39fa0bc6-d102-4cdb-951f-84a071a779b5'
        const { count: chunksForSubject } = await supabase.from('document_chunks').select('*', { count: 'exact', head: true }).contains('metadata', { subject_id: testSubjectId })
        console.log(`\nChunks found for subject ${testSubjectId}: ${chunksForSubject}`)
    }
}

checkCounts()
