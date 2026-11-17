import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0"

serve(async (req) => {
  try {
    const authHeader = req.headers.get("Authorization")
    if (!authHeader) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 })

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    )

    const token = authHeader.replace("Bearer ", "")
    const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(token)
    if (authErr || !user) return new Response(JSON.stringify({ error: "Invalid session" }), { status: 401 })

    // Verify caller is an active administrator in DB (SSOT)
    const { data: callerProfile, error: profileErr } = await supabaseAdmin
      .from("profiles")
      .select("role, account_status")
      .eq("id", user.id)
      .single()

    if (profileErr || callerProfile.role !== "admin" || callerProfile.account_status !== "active") {
      return new Response(JSON.stringify({ error: "Access denied: caller is not an active administrator" }), { status: 403 })
    }

    const { email, full_name, initial_password } = await req.json()
    const normalizedEmail = email.toLowerCase().trim()

    // Step 1: Pre-register into authorized_admins table
    const { error: allowlistErr } = await supabaseAdmin
      .from("authorized_admins")
      .upsert({ email: normalizedEmail, full_name, is_active: true, updated_at: new Date() })

    if (allowlistErr) throw new Error(allowlistErr.message)

    // Step 2: Create Auth User via Admin API
    const { data: createdAuthUser, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email: normalizedEmail,
      password: initial_password || crypto.randomUUID() + "!Aa1",
      email_confirm: true,
      app_metadata: { role: "admin" },
      user_metadata: { full_name }
    })

    if (createErr) {
      await supabaseAdmin.from("authorized_admins").delete().eq("email", normalizedEmail)
      return new Response(JSON.stringify({ error: `Auth creation failed: ${createErr.message}` }), { status: 400 })
    }

    // Step 3: Verify Profile Created by Trigger
    const { data: createdProfile, error: verifyErr } = await supabaseAdmin
      .from("profiles")
      .select("role, account_status")
      .eq("id", createdAuthUser.user.id)
      .single()

    if (verifyErr || createdProfile.role !== "admin") {
      // Compensating rollback
      await supabaseAdmin.auth.admin.deleteUser(createdAuthUser.user.id)
      await supabaseAdmin.from("authorized_admins").delete().eq("email", normalizedEmail)
      return new Response(JSON.stringify({ error: "Profile synchronization failure; transaction reverted" }), { status: 500 })
    }

    return new Response(JSON.stringify({ success: true, user_id: createdAuthUser.user.id }), { status: 201 })
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
})