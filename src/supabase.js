import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || __SUPABASE_URL__
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || __SUPABASE_ANON_KEY__

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'Supabase credentials not found. Check your .env file and build pipeline.'
  )
}

const isNative = typeof window !== 'undefined' && window.Capacitor?.isNativePlatform?.()

function cleanupStalePkceState() {
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && (key === 'supabase.auth.auth-code' || key === 'supabase.auth.code-verifier' || key.includes('oauth_state'))) {
        localStorage.removeItem(key)
        i--
      }
    }
  } catch (e) {
    // localStorage pode nao estar disponivel
  }
}

if (isNative) {
  // Desativado para evitar que remova o code-verifier ao retornar do navegador de login (OAuth)
  // cleanupStalePkceState()
}

export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        flowType: 'pkce',
        detectSessionInUrl: !isNative,
        persistSession: true,
        autoRefreshToken: true,
        storage: isNative
          ? {
              getItem: (key) => {
                try {
                  const val = localStorage.getItem(key)
                  return val
                } catch { return null }
              },
              setItem: (key, value) => {
                try {
                  localStorage.setItem(key, value)
                } catch {}
              },
              removeItem: (key) => {
                try {
                  localStorage.removeItem(key)
                } catch {}
              },
            }
          : undefined,
      },
    })
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

export async function saveSong(name, content, youtubeUrl = '', composer = '', key = '', contentGuitar = '') {
  if (!supabase) return null
  const row = { name, content, youtube_url: youtubeUrl, composer, key }
  if (contentGuitar) row.content_guitar = contentGuitar
  const { data, error } = await supabase
    .from('songs')
    .insert([row])
    .select()
    .single()
  if (error) {
    console.error('Error saving song:', error)
    return null
  }
  return data
}

export async function updateSong(id, updates) {
  if (!supabase) return null
  const { data, error } = await supabase
    .from('songs')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) {
    console.error('Error updating song:', error)
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

let authResolve = null

export async function signInWithGoogle() {
  if (!supabase) return
  const isNative = typeof window !== 'undefined' && window.Capacitor?.isNativePlatform?.()
  const redirectUrl = isNative
    ? 'cifrasicr.app://auth/callback'
    : `${window.location.origin}/auth/callback`
  
  if (isNative) {
    return new Promise(async (resolve) => {
      authResolve = resolve
      const { Browser } = await import('@capacitor/browser')
      
      const { data: { url }, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { 
          redirectTo: redirectUrl,
          skipBrowserRedirect: true,
        }
      })
      
      if (error) {
        console.error('[Auth] Error getting OAuth URL:', error)
        authResolve?.(null)
        return
      }
      
      console.log('[Auth] Opening OAuth URL:', url)
      await Browser.open({ url })
      
      import('@capacitor/browser').then(({ Browser: BrowserEvents }) => {
        BrowserEvents.addListener('browserFinished', async () => {
          console.log('[Auth] Browser closed, checking session...')
          if (supabase) {
            const { data: { session } } = await supabase.auth.getSession()
            console.log('[Auth] Session after browser close:', session ? 'active' : 'none')
            if (session?.user) {
              authResolve?.(session.user)
            } else {
              authResolve?.(null)
            }
          } else {
            authResolve?.(null)
          }
        })
      })
    })
  } else {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: redirectUrl },
    })
    if (error) console.error('Error signing in:', error)
  }
}

export async function createUser(email, password, name) {
  if (!supabase) return { data: null, error: { message: 'Supabase not configured' } }
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: name,
      },
    },
  })
  return { data, error }
}

export async function signInWithEmail(email, password) {
  if (!supabase) return { data: null, error: { message: 'Supabase not configured' } }
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })
  return { data, error }
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
  try {
    const result = await Promise.race([
      supabase.auth.getSession().catch((err) => {
        console.warn('[Auth] getSession error:', err)
        return { data: { session: null }, error: err }
      }),
      new Promise(resolve => setTimeout(() => resolve({ data: { session: null } }), 4000)),
    ])

    if (result?.error && (
      result.error.message?.includes('Invalid Refresh Token') ||
      result.error.message?.includes('invalid_grant') ||
      result.error.status === 400
    )) {
      console.warn('[Auth] Clearing corrupted auth session from storage')
      await supabase.auth.signOut().catch(() => {})
      return null
    }

    return result?.data?.session?.user || null
  } catch (e) {
    console.error('[Auth] getCurrentUser exception:', e)
    return null
  }
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

export async function fetchDomingoList(location) {
  if (!supabase) return null
  const listName = location ? `Esse Domingo - ${location}` : 'Esse Domingo'
  const { data, error } = await supabase
    .from('lists')
    .select('*')
    .eq('name', listName)
    .maybeSingle()
  if (error) {
    console.error('Error fetching domingo list:', error)
    return null
  }
  return data
}
