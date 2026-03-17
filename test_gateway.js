import fetch from 'node-fetch'

async function checkGateway() {
    const res = await fetch('https://qdbsdsnhygxlzrjmvhva.supabase.co/functions/v1/does-not-exist', {
        method: 'POST'
    })
    console.log('does-not-exist status:', res.status)
    console.log('does-not-exist body:', await res.text())

    const res2 = await fetch('https://qdbsdsnhygxlzrjmvhva.supabase.co/functions/v1/user-management', {
        method: 'POST'
    })
    console.log('user-management no-jwt status:', res2.status)
    console.log('user-management no-jwt body:', await res2.text())
}

checkGateway()
