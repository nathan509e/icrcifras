import { createContext, useContext, useState, useEffect, useRef } from 'react'
import { getCurrentUser, onAuthChange, isAdmin, fetchUserLists, supabase } from './supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [userIsAdmin, setUserIsAdmin] = useState(false)
  const [userLists, setUserLists] = useState([])
  const processedUrlsRef = useRef(new Set())
  const lastEmailRef = useRef(null)

  useEffect(() => {
    getCurrentUser().then(setUser)
    const unsubscribe = onAuthChange(setUser)
    return unsubscribe
  }, [])

  // Handle OAuth callback via deep link globally
  useEffect(() => {
    let unsub
    const isNative = window.Capacitor?.isNativePlatform?.()
    
    if (!isNative) return

    const handleAuthUrl = async (url) => {
      console.log('[Auth] Deep link received:', url)
      
      if (!url || !url.includes('auth/callback')) {
        return
      }

      // Avoid re-processing identical deep link URLs on app re-open/resume
      if (processedUrlsRef.current.has(url) || sessionStorage.getItem('processed_auth_url') === url) {
        console.log('[Auth] Deep link already processed, skipping:', url)
        return
      }
      processedUrlsRef.current.add(url)
      try {
        sessionStorage.setItem('processed_auth_url', url)
      } catch {}

      try {
        const { Browser } = await import('@capacitor/browser')
        await Browser.close()
      } catch {}

      try {
        const code = url.match(/[?&]code=([^&#]+)/)?.[1]
        if (code) {
          console.log('[Auth] Exchanging code for session...')
          const { data, error } = await supabase.auth.exchangeCodeForSession(code)
          if (error) throw error
          if (data.session?.user) {
            setUser(data.session.user)
            return
          }
        } else {
          const accessToken = url.match(/[#?&]access_token=([^&#]+)/)?.[1]
          const refreshToken = url.match(/[#?&]refresh_token=([^&#]+)/)?.[1]
          if (accessToken && refreshToken) {
            console.log('[Auth] Setting session via tokens...')
            const { data, error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken
            })
            if (error) throw error
            if (data.session?.user) {
              setUser(data.session.user)
              return
            }
          }
        }
      } catch (err) {
        console.error('[Auth] Error processing auth redirect:', err)
      }
    }

    import('@capacitor/app').then(({ App }) => {
      // Check if app was launched by a deep link URL
      App.getLaunchUrl().then(({ url }) => {
        if (url) {
          handleAuthUrl(url)
        }
      })

      // Listen for deep link events when app is already open
      App.addListener('appUrlOpen', (event) => {
        handleAuthUrl(event.url)
      }).then(listener => { unsub = listener })
    })

    return () => { unsub?.remove() }
  }, [])

  useEffect(() => {
    const email = user?.email || null
    if (email === lastEmailRef.current) return
    lastEmailRef.current = email
    if (email) {
      isAdmin(email).then(setUserIsAdmin)
      fetchUserLists(email).then(setUserLists)
    } else {
      setUserIsAdmin(false)
      setUserLists([])
    }
  }, [user])

  return (
    <AuthContext.Provider value={{ user, setUser, userIsAdmin, setUserIsAdmin, userLists, setUserLists }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
