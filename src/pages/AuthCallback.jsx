import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'

export default function AuthCallback() {
  const navigate = useNavigate()

  useEffect(() => {
    // Escuta a mudança de estado de autenticação para redirecionar assim que logar
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        navigate('/', { replace: true })
      }
    })

    // Redirecionamento de segurança caso demore muito
    const timeout = setTimeout(() => {
      navigate('/', { replace: true })
    }, 4000)

    return () => {
      subscription.unsubscribe()
      clearTimeout(timeout)
    }
  }, [navigate])

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      backgroundColor: '#111827',
      color: '#ffffff',
      fontFamily: 'system-ui, sans-serif'
    }}>
      <div style={{
        border: '4px solid rgba(255,255,255,0.1)',
        borderLeftColor: '#059669',
        borderRadius: '50%',
        width: '40px',
        height: '40px',
        animation: 'spin 1s linear infinite',
        marginBottom: '16px'
      }} />
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
      <p style={{ fontSize: '1.1rem', fontWeight: '500' }}>Autenticando...</p>
      <p style={{ color: '#9ca3af', fontSize: '0.9rem', marginTop: '4px' }}>Por favor, aguarde enquanto conectamos sua conta.</p>
    </div>
  )
}
