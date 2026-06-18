import { createContext, useContext, useState, useEffect, useRef } from 'react'
import { getCurrentUser, onAuthChange, isAdmin, fetchUserLists } from './supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [userIsAdmin, setUserIsAdmin] = useState(false)
  const [userLists, setUserLists] = useState([])
  const lastEmailRef = useRef(null)

  useEffect(() => {
    getCurrentUser().then(setUser)
    const unsubscribe = onAuthChange(setUser)
    return unsubscribe
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
