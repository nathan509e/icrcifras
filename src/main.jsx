import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import './index.css'
import { AuthProvider } from './AuthContext'
import ErrorBoundary from './components/ErrorBoundary'
import App from './App.jsx'
import MusicasPage from './pages/MusicasPage'
import PrivacyPolicyPage from './pages/PrivacyPolicyPage'

// Hide splash screen on app ready
function hideSplash() {
  try {
    const { SplashScreen } = window.Capacitor?.Plugins || {}
    if (SplashScreen?.hide) SplashScreen.hide()
  } catch (e) {
    // Not in native app
  }
}

window.addEventListener('DOMContentLoaded', hideSplash, { once: true })

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('SW registered:', registration)
      })
      .catch((error) => {
        console.log('SW registration failed:', error)
      })
  })
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<MusicasPage />} />
            <Route path="/privacidade" element={<PrivacyPolicyPage />} />
            <Route path="/:songId" element={<App />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>,
)
