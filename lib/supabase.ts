import { createClient } from '@supabase/supabase-js'

// ⚠️ PASTE YOUR REAL STRINGS INSIDE THE QUOTES BELOW ⚠️
const supabaseUrl = "https://nidkpphgcjqjiwedaqbm.supabase.co"
const supabaseAnonKey = "sb_publishable_9J12QG_LzCCkSxGBC780AA_KPLU7rH_" // Paste your full key here

export const supabase = createClient(supabaseUrl, supabaseAnonKey)