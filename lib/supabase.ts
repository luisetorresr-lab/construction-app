import { createClient } from '@supabase/supabase-js'

// process.env reads from your .env.local file
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// This validation helps debug if the file isn't being read
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase Environment Variables. Check .env.local')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)