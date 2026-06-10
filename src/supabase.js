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

// ---- SONGS ----

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

export async function saveSong(name, content, youtubeUrl = '', composer = '', key = '') {
  if (!supabase) return null
  const { data, error } = await supabase
    .from('songs')
    .insert([{ name, content, youtube_url: youtubeUrl, composer, key }])
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

// ---- AUTH ----

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

// ---- ADMINS ----

export async function isAdmin(email) {
  if (!supabase || !email) return false
  const { data } = await supabase
    .from('admins')
    .select('email')
    .eq('email', email)
    .maybeSingle()
  return !!data
}

// ---- SUGGESTIONS ----

export async function fetchSuggestions() {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('suggestions')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) {
    console.error('Error fetching suggestions:', error)
    return []
  }
  return data || []
}

export async function saveSuggestion(userName, songName, youtubeUrl, userEmail = '') {
  if (!supabase) return null
  const { data, error } = await supabase
    .from('suggestions')
    .insert([{ user_name: userName, song_name: songName, youtube_url: youtubeUrl, user_email: userEmail, status: 'pending' }])
    .select()
    .single()
  if (error) {
    console.error('Error saving suggestion:', error)
    return null
  }
  return data
}

export async function deleteSuggestion(id) {
  if (!supabase) return false
  const { error } = await supabase
    .from('suggestions')
    .delete()
    .eq('id', id)
  if (error) {
    console.error('Error deleting suggestion:', error)
    return false
  }
  return true
}

export async function updateSuggestionStatus(id, status) {
  if (!supabase) return false
  const { error } = await supabase
    .from('suggestions')
    .update({ status })
    .eq('id', id)
  if (error) {
    console.error('Error updating suggestion status:', error)
    return false
  }
  return true
}

export async function fetchUserSuggestions(email) {
  if (!supabase || !email) return []
  const { data, error } = await supabase
    .from('suggestions')
    .select('*')
    .eq('user_email', email)
    .order('created_at', { ascending: false })
  if (error) {
    console.error('Error fetching user suggestions:', error)
    return []
  }
  return data || []
}

// ---- LISTS ----

export async function fetchUserLists(email) {
  if (!supabase || !email) return []
  const { data, error } = await supabase
    .from('lists')
    .select('*')
    .eq('user_email', email)
    .order('created_at', { ascending: false })
  if (error) {
    console.error('Error fetching user lists:', error)
    return []
  }
  return data || []
}

export async function createList(name, userEmail, songIds = []) {
  if (!supabase) return null
  const { data, error } = await supabase
    .from('lists')
    .insert([{ name, user_email: userEmail, song_ids: songIds }])
    .select()
    .single()
  if (error) {
    console.error('Error creating list:', error)
    return null
  }
  return data
}

export async function updateList(id, name, songIds) {
  if (!supabase) return false
  const { error } = await supabase
    .from('lists')
    .update({ name, song_ids: songIds })
    .eq('id', id)
  if (error) {
    console.error('Error updating list:', error)
    return false
  }
  return true
}

export async function deleteList(id) {
  if (!supabase) return false
  const { error } = await supabase
    .from('lists')
    .delete()
    .eq('id', id)
  if (error) {
    console.error('Error deleting list:', error)
    return false
  }
  return true
}
