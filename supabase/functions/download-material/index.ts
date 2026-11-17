import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })

  try {
    const authHeader = req.headers.get("Authorization")
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      })
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    )

    const token = authHeader.replace("Bearer ", "")
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid or expired session" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      })
    }

    const { material_id } = await req.json()
    if (!material_id) {
      return new Response(JSON.stringify({ error: "material_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      })
    }

    // Atomic Combined Query: caller profile + target material (prevents deletion race condition)
    const { data: callerProfile, error: profileErr } = await supabaseAdmin
      .from("profiles")
      .select("role, account_status")
      .eq("id", user.id)
      .single()

    if (profileErr || !callerProfile || callerProfile.account_status !== "active") {
      return new Response(JSON.stringify({ error: "Account suspended or not active" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      })
    }

    const { data: material, error: matErr } = await supabaseAdmin
      .from("materials")
      .select("id, file_path, file_name, status, uploaded_by")
      .eq("id", material_id)
      .single()

    if (matErr || !material) {
      return new Response(JSON.stringify({ error: "Material not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      })
    }

    const isAdmin = callerProfile.role === "admin"
    const isOwner = material.uploaded_by === user.id

    // Deleted material: Strictly inaccessible to everyone through download endpoint
    if (material.status === "deleted") {
      return new Response(JSON.stringify({ error: "This material has been permanently removed" }), {
        status: 410,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      })
    }

    // Authorization evaluation
    if (material.status !== "approved" && !isOwner && !isAdmin) {
      return new Response(JSON.stringify({ error: "Access denied: material is pending review" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      })
    }

    // Generate Signed URL (60 seconds TTL)
    const { data: signedData, error: storageErr } = await supabaseAdmin.storage
      .from("campus_materials")
      .createSignedUrl(material.file_path, 60, {
        download: material.file_name
      })

    if (storageErr || !signedData?.signedUrl) {
      return new Response(JSON.stringify({ error: "Storage signed URL generation failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      })
    }

    // Counter only increments upon verified, successful URL generation
    await supabaseAdmin.rpc("increment_download_request_count", { p_material_id: material.id })

    return new Response(
      JSON.stringify({
        signed_url: signedData.signedUrl,
        file_name: material.file_name,
        expires_in: 60
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    })
  }
})