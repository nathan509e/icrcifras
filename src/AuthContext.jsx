import { createContext, useContext, useState, useEffect } from 'react'
import { getCurrentUser, onAuthChange, isAdmin, fetchUserLists } from './supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [userIsAdmin, setUserIsAdmin] = useState(false)
  const [userLists, setUserLists] = useState([])

  useEffect(() => {
    getCurrentUser().then(setUser)
    const unsubscribe = onAuthChange(setUser)
    return unsubscribe
  }, [])

  useEffect(() => {
    if (user?.email) {
      isAdmin(user.email).then(setUserIsAdmin)
      fetchUserLists(user.email).then(setUserLists)
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
