import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import './index.css'
import { AuthProvider } from './AuthContext'
import ErrorBoundary from './components/ErrorBoundary'
import App from './App.jsx'
import MusicasPage from './pages/MusicasPage'
import PrivacyPolicyPage from './pages/PrivacyPolicyPage'

// Hide mobile navs when keyboard is open
;(function initKeyboardDetection() {
  if (window.innerWidth > 767) return

  const html = document.documentElement
  const inputs = ['input', 'textarea', 'select']

  function isInputFocused() {
    const el = document.activeElement
    return el && inputs.includes(el.tagName.toLowerCase())
  }

  function onFocusIn(e) {
    if (inputs.includes(e.target.tagName.toLowerCase())) {
      html.classList.add('keyboard-open')
    }
  }

  function onFocusOut() {
    setTimeout(() => {
      if (!isInputFocused()) {
        html.classList.remove('keyboard-open')
      }
    }, 100)
  }

  function onViewportResize() {
    const vh = window.visualViewport
    if (!vh) return
    // If viewport height is significantly smaller than screen height, keyboard is open
    if (vh.height < window.screen.height * 0.8) {
      html.classList.add('keyboard-open')
    } else {
      setTimeout(() => {
        if (!isInputFocused()) {
          html.classList.remove('keyboard-open')
        }
      }, 100)
    }
  }

  document.addEventListener('focusin', onFocusIn)
  document.addEventListener('focusout', onFocusOut)
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', onViewportResize)
  }
})()

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
