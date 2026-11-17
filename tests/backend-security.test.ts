import { describe, it, expect, beforeAll } from "vitest"
import { createClient } from "@supabase/supabase-js"

const SUPABASE_URL = process.env.VITE_SUPABASE_URL!
const ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY!
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

const anonClient = createClient(SUPABASE_URL, ANON_KEY)
const adminClient = createClient(SUPABASE_URL, SERVICE_KEY)

describe("CampusLearn Comprehensive Security Test Suite", () => {
  let studentA: any
  let studentB: any
  let adminUser: any
  let pendingMaterialId: string

  beforeAll(async () => {
    // 1. Pre-register admin in authorized_admins
    await adminClient.from("authorized_admins").upsert({
      email: "admin@campuslearn.edu",
      full_name: "Initial System Administrator",
      is_active: true
    })

    // 2. Create admin via Admin API
    const { data: adminAuth } = await adminClient.auth.admin.createUser({
      email: "admin@campuslearn.edu",
      password: "AdminPassword#2026",
      email_confirm: true,
      app_metadata: { role: "admin" }
    })
    adminUser = adminAuth.user
  })

  it("1. Reject unauthorized student registration", async () => {
    const { error } = await anonClient.auth.signUp({
      email: "2401CE99999@campuslearn.internal",
      password: "TestPassword#2026"
    })
    expect(error).not.toBeNull()
    expect(error?.message).toContain("not authorized")
  })

  it("2. Allow valid authorized student registration", async () => {
    const { data, error } = await anonClient.auth.signUp({
      email: "2401CE10101@campuslearn.internal",
      password: "ValidPassword#2026"
    })
    expect(error).toBeNull()
    expect(data.user).toBeDefined()
    studentA = data.user

    const { data: profile } = await adminClient.from("profiles").select("*").eq("id", studentA.id).single()
    expect(profile.role).toBe("student")
    expect(profile.department_code).toBe("CE")
    expect(profile.account_status).toBe("active")
  })

  it("3. Prevent duplicate student registration", async () => {
    const { error } = await anonClient.auth.signUp({
      email: "2401CE10101@campuslearn.internal",
      password: "ValidPassword#2026"
    })
    expect(error).not.toBeNull()
    expect(error?.message).toContain("already exists")
  })

  it("4. Recover register number when account is deleted", async () => {
    // Delete student A
    await adminClient.auth.admin.deleteUser(studentA.id)

    // Verify authorized_students reset via trigger
    const { data: authRecord } = await adminClient
      .from("authorized_students")
      .select("is_registered, user_id")
      .eq("register_number", "2401CE10101")
      .single()

    expect(authRecord.is_registered).toBe(false)
    expect(authRecord.user_id).toBeNull()

    // Re-register student A successfully
    const { data, error } = await anonClient.auth.signUp({
      email: "2401CE10101@campuslearn.internal",
      password: "ValidPassword#2026"
    })
    expect(error).toBeNull()
    studentA = data.user
  })

  it("5. Block student privilege escalation attempts", async () => {
    const { data } = await anonClient.auth.signUp({
      email: "2401AD10101@campuslearn.internal",
      password: "ValidPassword#2026",
      options: { data: { role: "admin" } } // Attempted client-side metadata injection
    })
    studentB = data.user
    const { data: profile } = await adminClient.from("profiles").select("role").eq("id", studentB.id).single()
    expect(profile.role).toBe("student") // Escalation rejected
  })

  it("6. Block public creation of admin accounts", async () => {
    const { error } = await anonClient.auth.signUp({
      email: "admin@campuslearn.edu",
      password: "AttackerPassword#2026"
    })
    expect(error).not.toBeNull()
    expect(error?.message).toContain("Public registration requires an authorized College Register Number")
  })

  it("7. Prevent final active admin demotion or suspension", async () => {
    const { error } = await adminClient.rpc("admin_set_user_role", {
      p_target_user_id: adminUser.id,
      p_new_role: "student"
    })
    expect(error).not.toBeNull()
    expect(error?.message).toContain("Cannot demote the final active administrator")
  })

  it("8. Prevent suspended users from accessing downloads or uploads", async () => {
    // Suspend Student B
    await adminClient.rpc("admin_set_account_status", {
      p_target_user_id: studentB.id,
      p_new_status: "suspended"
    })

    const studentBClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${studentB.id}` } }
    })

    const { error: uploadError } = await studentBClient.from("materials").insert({
      title: "Test Note",
      file_name: "test.pdf",
      file_path: `notes/${studentB.id}/test.pdf`,
      file_size_bytes: 1000,
      mime_type: "application/pdf",
      file_extension: "pdf",
      category: "notes",
      subject: "Data Structures",
      semester: "Sem 1",
      department_code: "AD",
      uploaded_by: studentB.id
    })
    expect(uploadError).not.toBeNull()
  })

  it("9. Isolate pending files from other students", async () => {
    // Mock upload material for Student A
    const { data: material } = await adminClient.from("materials").insert({
      title: "Student A Pending Note",
      file_name: "notes.pdf",
      file_path: `notes/${studentA.id}/notes.pdf`,
      file_size_bytes: 2000,
      mime_type: "application/pdf",
      file_extension: "pdf",
      category: "notes",
      subject: "Math",
      semester: "Sem 1",
      department_code: "CE",
      uploaded_by: studentA.id,
      status: "pending"
    }).select().single()

    pendingMaterialId = material.id

    // Call signed download Edge Function as Student B
    const res = await fetch(`${SUPABASE_URL}/functions/v1/download-material`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${studentB.id}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ material_id: pendingMaterialId })
    })

    expect(res.status).toBe(403)
  })

  it("10. Completely deny access to deleted materials", async () => {
    // Admin marks material as deleted
    await adminClient.rpc("admin_prepare_material_deletion", { p_material_id: pendingMaterialId })

    // Call download Edge Function as Admin
    const res = await fetch(`${SUPABASE_URL}/functions/v1/download-material`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${adminUser.id}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ material_id: pendingMaterialId })
    })

    expect(res.status).toBe(410)
  })

  it("11. Atomic worker claim with processing lease", async () => {
    const { data: claimedTask, error } = await adminClient.rpc("claim_next_cleanup_task", {
      p_lease_seconds: 300
    })
    expect(error).toBeNull()
    expect(claimedTask).toBeDefined()
    expect(claimedTask.status).toBe("processing")
  })
})