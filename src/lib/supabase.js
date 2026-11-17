import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || ''

// Check whether key is missing or still set to a template placeholder
const isPlaceholderKey =
  !supabasePublishableKey ||
  supabasePublishableKey === 'your_publishable_key' ||
  supabasePublishableKey.startsWith('your_') ||
  supabasePublishableKey.length < 20

if (!supabaseUrl) {
  console.error(
    '[Supabase Config Error] Missing VITE_SUPABASE_URL in environment configuration.'
  )
}

if (isPlaceholderKey) {
  console.warn(
    '[Supabase Config Notice] VITE_SUPABASE_PUBLISHABLE_KEY is currently set to a placeholder string ("your_publishable_key"). Running in demo preview mode until a valid Supabase anon/publishable key is supplied.'
  )
}

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabasePublishableKey &&
  !isPlaceholderKey
)

let supabaseInstance = null

if (isSupabaseConfigured) {
  try {
    supabaseInstance = createClient(supabaseUrl, supabasePublishableKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  } catch (error) {
    console.error('[Supabase Client Error] Failed to initialize Supabase client:', error)
    supabaseInstance = null
  }
}

export const supabase = supabaseInstance
export default supabase
