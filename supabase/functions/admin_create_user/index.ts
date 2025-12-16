// supabase/functions/admin_create_user/index.ts
/// <reference lib="deno.ns" />
import { serve } from "@std/http"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4?target=deno"
import { corsHeaders } from "../_shared/cors.ts"

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders })
  }

  try {
    // Variabel ini sudah tersedia otomatis di Edge Functions runtime
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const { email, password, username, full_name, phone } = await req.json()
    
    if (!email || !password || !username || !full_name) {
      return new Response(JSON.stringify({ error: "email, password, username, full_name wajib diisi" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    // Create auth user first
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { username, full_name },
    })
    
    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }
    
    const user = data.user
    if (!user) {
      return new Response(JSON.stringify({ error: "Gagal membuat user Auth" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    // Then insert to profiles
    const { error: profErr } = await supabase
      .from("profiles")
      .upsert(
        [{ user_id: user.id, full_name, phone: phone || null }],
        { onConflict: "user_id" }
      )
    
    if (profErr) {
      return new Response(JSON.stringify({ error: profErr.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    return new Response(JSON.stringify({ ok: true, user_id: user.id }), {
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
