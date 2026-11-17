import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0"

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
)

export async function processStorageCleanupQueue() {
  while (true) {
    // 1. Atomic Claim using FOR UPDATE SKIP LOCKED with a 5-minute lease via RPC
    const { data: task, error: claimErr } = await supabaseAdmin.rpc("claim_next_cleanup_task", {
      p_lease_seconds: 300
    })

    if (claimErr || !task || !task.id) {
      break // Queue empty or all eligible tasks are claimed
    }

    try {
      // 2. Storage API Deletion (Physical object removal)
      const { error: storageErr } = await supabaseAdmin.storage
        .from("campus_materials")
        .remove([task.file_path])

      if (storageErr) {
        throw new Error(storageErr.message)
      }

      // 3. Confirm Purge in DB & finalize queue item
      await supabaseAdmin.rpc("admin_confirm_material_purged", {
        p_material_id: task.material_id
      })
    } catch (err: any) {
      const nextRetries = task.retry_count + 1
      const isDeadLetter = nextRetries >= task.max_retries
      const backoffMs = Math.pow(2, nextRetries) * 60 * 1000 // Exponential backoff

      await supabaseAdmin
        .from("orphaned_storage_cleanup_queue")
        .update({
          status: isDeadLetter ? "dead_letter" : "failed",
          retry_count: nextRetries,
          last_error: err.message,
          lease_expires_at: null,
          next_retry_at: new Date(Date.now() + backoffMs),
          updated_at: new Date()
        })
        .eq("id", task.id)
    }
  }
}