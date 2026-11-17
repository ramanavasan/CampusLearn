import { supabase, isSupabaseConfigured } from './supabase'

/**
 * Fetch approved materials for students and public explorer
 */
export async function getApprovedMaterials({ category, semester, search } = {}) {
  if (!isSupabaseConfigured || !supabase) {
    return { data: [], error: null }
  }

  try {
    let query = supabase
      .from('materials')
      .select(`
        id,
        title,
        description,
        file_name,
        file_path,
        file_size_bytes,
        mime_type,
        file_extension,
        category,
        subject,
        semester,
        department_code,
        download_request_count,
        created_at,
        profiles:uploaded_by (full_name)
      `)
      .eq('status', 'approved')
      .order('created_at', { ascending: false })

    if (category && category !== 'All') {
      query = query.eq('category', category.toLowerCase().replace(/\s+/g, '_'))
    }
    if (semester && semester !== 'All') {
      query = query.eq('semester', semester)
    }
    if (search && search.trim()) {
      const q = search.trim()
      query = query.or(`title.ilike.%${q}%,subject.ilike.%${q}%`)
    }

    const { data, error } = await query
    return { data: data || [], error }
  } catch (err) {
    return { data: [], error: err.message }
  }
}

/**
 * Fetch all materials for Admin dashboard
 */
export async function getAllMaterialsAdmin() {
  if (!isSupabaseConfigured || !supabase) {
    return { data: [], error: null }
  }

  try {
    const { data, error } = await supabase
      .from('materials')
      .select(`
        id,
        title,
        description,
        file_name,
        file_path,
        file_size_bytes,
        mime_type,
        file_extension,
        category,
        subject,
        semester,
        department_code,
        status,
        download_request_count,
        created_at,
        profiles:uploaded_by (full_name, email)
      `)
      .neq('status', 'deleted')
      .order('created_at', { ascending: false })

    return { data: data || [], error }
  } catch (err) {
    return { data: [], error: err.message }
  }
}

/**
 * Upload material (PDF or Image) with Subject Code, Subject Name, Semester
 */
export async function uploadMaterial({ file, subjectCode, subjectName, semester, category, title, description }) {
  if (!isSupabaseConfigured || !supabase) {
    return { success: false, error: 'Supabase credentials are not configured.' }
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'You must be signed in to upload study materials.' }
  }

  // Get user profile for department
  const { data: profile } = await supabase
    .from('profiles')
    .select('department_code, role')
    .eq('id', user.id)
    .single()

  const departmentCode = profile?.department_code || 'CE'
  const fileExt = file.name.split('.').pop().toLowerCase()
  const cleanFilename = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
  const cleanCategory = category.toLowerCase().replace(/\s+/g, '_')
  const storagePath = `${cleanCategory}/${user.id}/${Date.now()}_${cleanFilename}`

  // 1. Upload file binary to campus_materials storage bucket
  const { error: storageError } = await supabase.storage
    .from('campus_materials')
    .upload(storagePath, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type,
    })

  if (storageError) {
    return { success: false, error: `Upload failed: ${storageError.message}` }
  }

  const formattedSubject = `${subjectCode.trim().toUpperCase()} - ${subjectName.trim()}`

  // 2. Insert metadata record in PostgreSQL materials table
  const { data: record, error: dbError } = await supabase
    .from('materials')
    .insert([
      {
        title: title.trim() || file.name,
        description: description ? description.trim() : null,
        file_name: cleanFilename,
        file_path: storagePath,
        file_size_bytes: file.size,
        mime_type: file.type || 'application/octet-stream',
        file_extension: fileExt,
        category: cleanCategory,
        subject: formattedSubject,
        semester: semester,
        department_code: departmentCode,
        uploaded_by: user.id,
        status: 'approved',
      },
    ])
    .select()
    .single()

  if (dbError) {
    // Rollback storage upload on metadata failure
    await supabase.storage.from('campus_materials').remove([storagePath])
    return { success: false, error: `Database error: ${dbError.message}` }
  }

  return { success: true, material: record }
}

/**
 * Download material file (Generates signed URL and triggers browser download)
 */
export async function downloadMaterialFile(filePath, fileName = 'material') {
  if (!isSupabaseConfigured || !supabase) {
    alert('Supabase is not configured.')
    return
  }

  try {
    const { data, error } = await supabase.storage
      .from('campus_materials')
      .createSignedUrl(filePath, 3600, {
        download: fileName,
      })

    if (error || !data?.signedUrl) {
      throw new Error(error?.message || 'Failed to generate download URL')
    }

    // Trigger browser download
    const link = document.createElement('a')
    link.href = data.signedUrl
    link.setAttribute('download', fileName)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    return { success: true }
  } catch (err) {
    alert(`Could not download file: ${err.message}`)
    return { success: false, error: err.message }
  }
}

/**
 * Delete material (Admins Only)
 */
export async function deleteMaterial(materialId, filePath) {
  if (!isSupabaseConfigured || !supabase) {
    return { success: false, error: 'Supabase is not configured.' }
  }

  try {
    // 1. Delete physical file from storage if filePath is provided
    if (filePath) {
      await supabase.storage.from('campus_materials').remove([filePath])
    }

    // 2. Delete record from materials table
    const { error: dbError } = await supabase
      .from('materials')
      .delete()
      .eq('id', materialId)

    if (dbError) {
      return { success: false, error: dbError.message }
    }

    return { success: true }
  } catch (err) {
    return { success: false, error: err.message }
  }
}
