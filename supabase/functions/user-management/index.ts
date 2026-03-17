import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

const ADMIN_EMAIL = "arlei85@hotmail.com"

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get("Authorization")!
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE)

    // Identify requester
    const token = authHeader.replace("Bearer ", "")
    const { data: { user: requester }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !requester) {
      return new Response(JSON.stringify({ error: "Invalid user session" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const isAdmin = requester.email === ADMIN_EMAIL
    const body = await req.json()
    const { action, userId } = body

    // 1. LIST USERS (Admin Only)
    if (action === "list") {
      if (!isAdmin) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        })
      }

      // Fetch all users from auth.users (requires service_role)
      const { data: { users }, error: listError } = await supabase.auth.admin.listUsers()
      if (listError) throw listError

      // Fetch all profiles from public.profiles
      const { data: profiles, error: profileError } = await supabase
        .from("profiles")
        .select("*")
      
      if (profileError) throw profileError

      // Merge data
      const userList = users.map(u => {
        const profile = profiles.find(p => p.id === u.id)
        return {
          id: u.id,
          email: u.email,
          name: profile?.name || "Sem Nome",
          role: profile?.user_role || "student",
          created_at: u.created_at
        }
      })

      return new Response(JSON.stringify({ users: userList }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    // 2. DELETE USER
    if (action === "delete") {
      const targetUserId = userId || requester.id
      const isSelf = targetUserId === requester.id

      if (!isAdmin && !isSelf) {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        })
      }

      console.log(`[user-management] Deleting user ${targetUserId} requested by ${requester.email}`)

      const { error: deleteError } = await supabase.auth.admin.deleteUser(targetUserId)
      if (deleteError) throw deleteError

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })

  } catch (err: any) {
    console.error(`[user-management] Error:`, err.message)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }
})
