/// <reference lib="deno.ns" />
import { serve } from "@std/http"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4?target=deno"
import { corsHeaders } from "../_shared/cors.ts"

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders })
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
    
    if (!SUPABASE_URL || !SERVICE_KEY) {
      return new Response(JSON.stringify({ error: "Server configuration error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const { user_id, email, username, password } = await req.json()
    
    if (!user_id) {
      return new Response(JSON.stringify({ error: "user_id wajib" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const updates: any = {}
    if (email) updates.email = email
    if (password) updates.password = password
    if (username) {
      updates.user_metadata = { username }
    }

    if (Object.keys(updates).length > 0) {
      const { error: updErr } = await supabase.auth.admin.updateUserById(user_id, updates)
      if (updErr) {
        return new Response(JSON.stringify({ error: updErr.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        })
      }
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message ?? "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }
})
