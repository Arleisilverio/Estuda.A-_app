import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://qdbsdsnhygxlzrjmvhva.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFkYnNkc25oeWd4bHpyam12aHZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI0ODY5NzIsImV4cCI6MjA4ODA2Mjk3Mn0.m_kqvRXtlzH8Oqnz8GyJ8PTafXFOLSrNXknhiAVaowk'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
