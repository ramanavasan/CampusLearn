import { supabase, isSupabaseConfigured } from './supabase'

/**
 * Standardize student login identifier:
 * Convert alphanumeric register number (e.g. "2401CE10101")
 * to college domain: "<REG_NO>@campuslearn.edu".
 */
export function normalizeStudentIdentifier(identifier) {
  if (!identifier) return ''
  const trimmed = identifier.trim()
  if (trimmed.includes('@')) {
    return trimmed.toLowerCase()
  }
  return `${trimmed.toUpperCase()}@campuslearn.edu`
}

/**
 * Sign in student or admin
 * @param {string} identifier - Register Number for student or email for admin
 * @param {string} password - User password
 * @param {'student' | 'admin'} expectedRole
 */
export async function signIn(identifier, password, expectedRole = 'student') {
  if (!isSupabaseConfigured || !supabase) {
    // Graceful preview/mockup response when Supabase is not connected
    return {
      success: true,
      user: {
        id: 'mock-user-id',
        email: identifier,
        role: expectedRole,
        fullName: expectedRole === 'admin' ? 'College Administrator' : 'Student Scholar',
      },
      isMock: true,
    }
  }

  const emailToUse =
    expectedRole === 'student'
      ? normalizeStudentIdentifier(identifier)
      : identifier.trim().toLowerCase()

  // Attempt login with credentials
  let { data, error } = await supabase.auth.signInWithPassword({
    email: emailToUse,
    password,
  })

  // If login failed for student with "Invalid login credentials", check if it's an authorized first-time student
  if (error && error.message.toLowerCase().includes('invalid login credentials') && expectedRole === 'student') {
    const rawRegNo = identifier.trim().includes('@')
      ? identifier.trim().split('@')[0].toUpperCase()
      : identifier.trim().toUpperCase()

    // Verify if this register number is pre-authorized in the database
    const { data: regAuth } = await supabase.rpc('verify_register_number', {
      p_reg_no: rawRegNo,
    })

    if (regAuth && regAuth.allowed) {
      // First-time registration: auto-provision user account with chosen password
      const signUpRes = await supabase.auth.signUp({
        email: emailToUse,
        password,
        options: {
          data: {
            full_name: `Student ${rawRegNo}`,
            register_number: rawRegNo,
            department_code: regAuth.department_code,
          },
        },
      })

      if (signUpRes.error) {
        return {
          success: false,
          error: signUpRes.error.message.includes('Public registration requires')
            ? 'First-time registration trigger error. Please run the SQL patch in Supabase SQL editor.'
            : signUpRes.error.message,
        }
      }

      if (signUpRes.data?.user) {
        data = signUpRes.data
        error = null
      }
    } else if (regAuth && !regAuth.allowed) {
      if (regAuth.reason === 'already_registered') {
        return {
          success: false,
          error: 'Incorrect password for this register number. Please check your password.',
        }
      } else if (regAuth.reason === 'not_found') {
        return {
          success: false,
          error: `Register number "${rawRegNo}" is not in the college authorized student list.`,
        }
      }
    }
  }

  if (error) {
    return { success: false, error: error.message }
  }

  if (!data?.user) {
    return { success: false, error: 'User session could not be established.' }
  }

  // Fetch verified profile from database
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', data.user.id)
    .single()

  if (profileError || !profile) {
    await supabase.auth.signOut()
    return {
      success: false,
      error: 'Profile record not found. Please contact the college administrator.',
    }
  }

  if (profile.account_status === 'suspended') {
    await supabase.auth.signOut()
    return {
      success: false,
      error: 'Your account has been suspended. Please contact the college administrator.',
    }
  }

  if (expectedRole && profile.role !== expectedRole) {
    await supabase.auth.signOut()
    return {
      success: false,
      error: `Access denied: Account role is "${profile.role}", but attempted login as "${expectedRole}".`,
    }
  }

  return {
    success: true,
    user: data.user,
    profile,
    isMock: false,
  }
}

/**
 * Student self-registration with authorized college register number
 */
export async function registerStudent({ registerNumber, fullName, password, departmentCode }) {
  if (!isSupabaseConfigured || !supabase) {
    return {
      success: false,
      error: 'Supabase credentials are not configured in .env. Please provide publishable/anon key.',
    }
  }

  const cleanRegNo = registerNumber.trim().toUpperCase()
  const syntheticEmail = `${cleanRegNo}@campuslearn.edu`

  const { data, error } = await supabase.auth.signUp({
    email: syntheticEmail,
    password,
    options: {
      data: {
        full_name: fullName.trim(),
        register_number: cleanRegNo,
        department_code: departmentCode,
      },
    },
  })

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true, user: data.user }
}

/**
 * Sign out current session
 */
export async function signOut() {
  if (!isSupabaseConfigured || !supabase) {
    return { success: true }
  }
  const { error } = await supabase.auth.signOut()
  return { success: !error, error: error?.message }
}

/**
 * Get current session and profile
 */
export async function getCurrentUser() {
  if (!isSupabaseConfigured || !supabase) {
    return null
  }
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', session.user.id)
    .single()

  return {
    user: session.user,
    profile,
  }
}
