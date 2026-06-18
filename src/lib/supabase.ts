import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || typeof supabaseUrl !== 'string' || supabaseUrl.trim() === '') {
  throw new Error('VITE_SUPABASE_URL não está definida no arquivo .env.local')
}

if (!supabaseAnonKey || typeof supabaseAnonKey !== 'string' || supabaseAnonKey.trim() === '') {
  throw new Error('VITE_SUPABASE_ANON_KEY não está definida no arquivo .env.local')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
})
