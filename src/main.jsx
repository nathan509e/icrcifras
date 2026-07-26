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
async function hideSplash() {
  try {
    const isNative = typeof window !== 'undefined' && window.Capacitor?.isNativePlatform?.()
    if (isNative) {
      const { SplashScreen } = await import('@capacitor/splash-screen')
      await SplashScreen.hide()
    } else {
      const { SplashScreen } = window.Capacitor?.Plugins || {}
      if (SplashScreen?.hide) SplashScreen.hide()
    }
  } catch (e) {
    console.warn('[Splash] Error hiding splash screen:', e)
  }
}

if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', hideSplash, { once: true })
} else {
  hideSplash()
}
// Safety fallback to guarantee splash screen is hidden
setTimeout(hideSplash, 1000)

const isNativeApp = typeof window !== 'undefined' && window.Capacitor?.isNativePlatform?.()

// Check Google Play Store for immediate app updates on Android
async function checkPlayStoreUpdate() {
  if (!isNativeApp) return
  try {
    const { AppUpdate, AppUpdateAvailability } = await import('@capawesome/capacitor-app-update')
    const result = await AppUpdate.getAppUpdateInfo()
    if (result.updateAvailability === AppUpdateAvailability.UPDATE_AVAILABLE) {
      if (result.immediateUpdateAllowed) {
        await AppUpdate.performImmediateUpdate()
      } else if (result.flexibleUpdateAllowed) {
        await AppUpdate.startFlexibleUpdate()
      }
    }
  } catch (e) {
    console.warn('[PlayStore] Check update error:', e)
  }
}

if (isNativeApp) {
  checkPlayStoreUpdate()
  import('@capacitor/app').then(({ App }) => {
    App.addListener('appStateChange', ({ isActive }) => {
      if (isActive) {
        hideSplash()
        checkPlayStoreUpdate()
      }
    })
  })
}
if ('serviceWorker' in navigator && import.meta.env.PROD && !isNativeApp) {
  let refreshing = false

  // Reload page when new service worker takes control
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!refreshing) {
      refreshing = true
      window.location.reload()
    }
  })

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('[SW] Registered:', registration)

        // Check for updates immediately on open
        registration.update().catch(() => {})

        // If a new worker is already waiting, activate it immediately
        if (registration.waiting) {
          registration.waiting.postMessage({ type: 'SKIP_WAITING' })
        }

        // Listen for new updates being installed
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                newWorker.postMessage({ type: 'SKIP_WAITING' })
              }
            })
          }
        })

        // Re-check for updates whenever page becomes visible or focused
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') {
            registration.update().catch(() => {})
          }
        })
        window.addEventListener('focus', () => registration.update().catch(() => {}))
      })
      .catch((error) => {
        console.warn('[SW] Registration failed:', error)
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
