import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://qdbsdsnhygxlzrjmvhva.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFkYnNkc25oeWd4bHpyam12aHZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI0ODY5NzIsImV4cCI6MjA4ODA2Mjk3Mn0.m_kqvRXtlzH8Oqnz8GyJ8PTafXFOLSrNXknhiAVaowk'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function test() {
    const { data: sessionData, error: signInError } = await supabase.auth.signInWithPassword({
        email: 'arlei85@hotmail.com',
        password: 'agz4897'
    })

    if (signInError) return console.log(signInError);

    const token = sessionData.session.access_token;
    console.log("Token length:", token.length);
    
    // Decode JWT payload (middle string of the three parts of JWT)
    const payloadBase64 = token.split('.')[1];
    const payloadDecoded = Buffer.from(payloadBase64, 'base64').toString('utf-8');
    
    console.log("Decoded Payload:", JSON.parse(payloadDecoded));
    
    console.log("Anon Key Payload:", JSON.parse(Buffer.from(supabaseAnonKey.split('.')[1], 'base64').toString('utf-8')));

}
test()
