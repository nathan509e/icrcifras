import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'Supabase credentials not found. Create a .env file based on .env.example.\n' +
    'The app will work with local songs only.'
  )
}

export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null

export async function fetchSongs() {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('songs')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) {
    console.error('Error fetching songs:', error)
    return []
  }
  return data || []
}

export async function saveSong(name, content, youtubeUrl = '') {
  if (!supabase) return null
  const { data, error } = await supabase
    .from('songs')
    .insert([{ name, content, youtube_url: youtubeUrl }])
    .select()
    .single()
  if (error) {
    console.error('Error saving song:', error)
    return null
  }
  return data
}

export async function deleteSong(id) {
  if (!supabase) return false
  const { error } = await supabase
    .from('songs')
    .delete()
    .eq('id', id)
  if (error) {
    console.error('Error deleting song:', error)
    return false
  }
  return true
}

export async function signInWithGoogle() {
  if (!supabase) return
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin,
    },
  })
  if (error) console.error('Error signing in:', error)
}

export async function signOut() {
  if (!supabase) return
  const { error } = await supabase.auth.signOut()
  if (error) console.error('Error signing out:', error)
}

export function onAuthChange(callback) {
  if (!supabase) return () => {}
  const { data } = supabase.auth.onAuthStateChange((event, session) => {
    callback(session?.user || null)
  })
  return data.subscription.unsubscribe
}

export async function getCurrentUser() {
  if (!supabase) return null
  const { data } = await supabase.auth.getSession()
  return data?.session?.user || null
}
