import React, { useRef, useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { signOut, fetchUserLists, fetchSuggestions as fetchSuggestionsFn, fetchUserSuggestions as fetchUserSuggestionsFn } from '../supabase'

const DEFAULT_ACCENT = '#fbb134'
const PRESET_COLORS = ['#fbb134', '#f97316', '#ef4444', '#ec4899', '#a855f7', '#6366f1', '#3b82f6', '#06b6d4', '#14b8a6', '#84cc16']

function hexToHue(hex) {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  let h = 0
  if (max !== min) {
    const d = max - min
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break
      case g: h = ((b - r) / d + 2) / 6; break
      case b: h = ((r - g) / d + 4) / 6; break
    }
  }
  return Math.round(h * 360)
}

function hslToHex(h, s, l) {
  const k = n => (n + h / 30) % 12
  const a = s * Math.min(l, 1 - l)
  const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))
  const toHex = x => Math.round(f(x) * 255).toString(16).padStart(2, '0')
  return `#${toHex(0)}${toHex(8)}${toHex(4)}`
}

const Navbar = React.memo(function Navbar({
  user,
  userIsAdmin,
  searchQuery,
  setSearchQuery,
  showSearchResults,
  setShowSearchResults,
  searchResults,
  loadSongContent,
  requestDelete,
  showDomingoModal,
  setShowDomingoModal,
  showMySongs,
  setShowMySongs,
  songFilter,
  setSongFilter,
  showListsModal,
  setShowListsModal,
  userLists,
  setUserLists,
  showUserSuggestions,
  setShowUserSuggestions,
  userSuggestions,
  setUserSuggestions,
  showSuggestionsList,
  setShowSuggestionsList,
  suggestions,
  setSuggestions,
  showAddModal,
  setShowAddModal,
  showLoginModal,
  setShowLoginModal,
  userMenuRef,
  showUserMenu,
  setShowUserMenu,
  avatarUrl,
  displayName,
  avatarLetter,
  isViewingSong,
  navigate,
  isMobileNav = false,
  fetchSuggestions: fetchSuggestionsProp,
  fetchUserSuggestions: fetchUserSuggestionsProp,
  showColorPicker: externalShowColorPicker,
  setShowColorPicker: externalSetShowColorPicker,
  instrumentMode,
  setInstrumentMode,
}) {
  const fetchSuggestions = fetchSuggestionsProp || fetchSuggestionsFn
  const fetchUserSuggestions = fetchUserSuggestionsProp || fetchUserSuggestionsFn
  const mobileBtnStyle = { display: 'flex', alignItems: 'center', justifyContent: 'center', width: 48, height: 48, borderRadius: 12, cursor: 'pointer', flexShrink: 0 }

  const [internalShowColorPicker, internalSetShowColorPicker] = useState(false)

  const showColorPicker = externalShowColorPicker !== undefined ? externalShowColorPicker : internalShowColorPicker
  const setShowColorPicker = externalSetShowColorPicker || internalSetShowColorPicker

  const [pickerHue, setPickerHue] = useState(hexToHue(DEFAULT_ACCENT))

  useEffect(() => {
    if (isViewingSong) {
      const saved = localStorage.getItem('accent-color')
      if (saved) {
        document.documentElement.style.setProperty('--accent-color', saved)
        const hue = hexToHue(saved)
        setPickerHue(hue)
      } else {
        document.documentElement.style.setProperty('--accent-color', DEFAULT_ACCENT)
        setPickerHue(hexToHue(DEFAULT_ACCENT))
      }
    } else {
      document.documentElement.style.setProperty('--accent-color', DEFAULT_ACCENT)
      setPickerHue(hexToHue(DEFAULT_ACCENT))
    }
  }, [isViewingSong])

  function handleHueChange(e) {
    const h = Number(e.target.value)
    setPickerHue(h)
    const hex = hslToHex(h, 0.85, 0.55)
    document.documentElement.style.setProperty('--accent-color', hex)
  }

  function applyAccentColor() {
    const hex = getComputedStyle(document.documentElement).getPropertyValue('--accent-color').trim() || DEFAULT_ACCENT
    localStorage.setItem('accent-color', hex)
    setShowColorPicker(false)
  }

  function resetAccentColor() {
    const defaultHue = hexToHue(DEFAULT_ACCENT)
    setPickerHue(defaultHue)
    document.documentElement.style.setProperty('--accent-color', DEFAULT_ACCENT)
    localStorage.removeItem('accent-color')
    setShowColorPicker(false)
  }

  // Se for a instância mobile nav, renderiza apenas o mobile nav
  if (isMobileNav) {
    // Renderizar nav fixo em baixo quando está vendo uma cifra
    if (isViewingSong) {
      return (
        <>
          <div className="nav-song-header-mobile">
            <button
              onClick={() => navigate('/')}
              className="nav-back-btn"
              title="Voltar"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', cursor: 'pointer', color: '#333' }}
            >
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 19l-7-7 7-7"/></svg>
            </button>
          </div>
        </>
      )
    }

      // Renderizar nav mobile em baixo quando está na tela inicial
    return (
      <>
        <nav className="nav-links nav-home-mobile">
          <button
            className="nav-mobile-bottom-btn"
            onClick={() => setShowDomingoModal(true)}
            title="Esse Domingo"
            style={{ ...mobileBtnStyle, background: '#fbb134', border: 'none', color: 'white' }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
          </button>
          {user && (
            <button
              className="nav-mobile-bottom-btn"
              onClick={() => setShowUserMenu(!showUserMenu)}
              title="Perfil"
              style={{ ...mobileBtnStyle, background: '#fbb134', border: 'none', color: 'white' }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            </button>
          )}
        {!user && (
          <button
            className="nav-mobile-bottom-btn"
            onClick={() => setShowLoginModal(true)}
            title="Entrar"
            style={{ ...mobileBtnStyle, background: '#fbb134', border: 'none', color: 'white', width: 'auto', padding: '0 16px', fontSize: 14, fontWeight: 600 }}
          >
            Entrar
          </button>
        )}
        
        {/* Menu do usuário que abre ao clicar no perfil */}
        {showUserMenu && user && (
          <div className="nav-mobile-user-menu">
            <button
              onClick={() => { fetchUserLists(user?.email).then(setUserLists); setShowListsModal(true); setShowUserMenu(false) }}
              className="nav-mobile-menu-item"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2z"/><polyline points="17 7 7 7 7 12 17 12 17 19 7 19"/></svg>
              Listas
            </button>
            {user && userIsAdmin && (
              <button
                onClick={() => { setShowAddModal(true); setShowUserMenu(false) }}
                className="nav-mobile-menu-item"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                Adicionar
              </button>
            )}
            {user && !userIsAdmin && (
              <button
                onClick={() => { fetchUserSuggestions(user.email).then(setUserSuggestions); setShowUserSuggestions(true); setShowUserMenu(false) }}
                className="nav-mobile-menu-item"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                Sugerir Louvor
              </button>
            )}
            {user && userIsAdmin && (
              <button
                onClick={() => { fetchSuggestions().then(setSuggestions); setShowSuggestionsList(true); setShowUserMenu(false) }}
                className="nav-mobile-menu-item"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><circle cx="9" cy="10" r="1"/><circle cx="12" cy="10" r="1"/><circle cx="15" cy="10" r="1"/></svg>
                Sugestoes
              </button>
            )}
            <button
              onClick={() => { signOut(); setShowUserMenu(false) }}
              className="nav-mobile-menu-item nav-mobile-menu-item--danger"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
              Sair
            </button>
          </div>
        )}

        <div className="nav-desktop-links">
          <button className="nav-link" onClick={() => { setSongFilter(''); setShowMySongs(true) }}>Louvores</button>
          <button className="nav-link" onClick={() => { fetchUserLists(user?.email).then(setUserLists); setShowListsModal(true) }}>Listas</button>
          {user && userIsAdmin && (
            <button className="nav-link" onClick={() => setShowAddModal(true)}>Adicionar</button>
          )}
          {user ? (
            <div className="nav-user" ref={userMenuRef}>
              <button className="nav-user-trigger" onClick={() => setShowUserMenu(v => !v)}>
                <span className="nav-avatar-wrap">
                  <img src={avatarUrl} alt="" className="nav-avatar" referrerPolicy="no-referrer" onLoad={e => { const fb = e.target.parentElement.querySelector('.nav-avatar-fallback'); if (fb) fb.style.display = 'none' }} onError={e => { e.target.style.display = 'none' }} />
                  <span className="nav-avatar-fallback">{avatarLetter}</span>
                </span>
                <span className="nav-username">{displayName}</span>
                <span className="nav-user-arrow">&#9662;</span>
              </button>
              {showUserMenu && (
                <div className="nav-user-card">
                  <div className="nav-user-card-header">
                    <span className="nav-avatar-wrap">
                      <img src={avatarUrl} alt="" className="nav-user-card-avatar" referrerPolicy="no-referrer" onLoad={e => { const fb = e.target.parentElement.querySelector('.nav-avatar-fallback'); if (fb) fb.style.display = 'none' }} onError={e => { e.target.style.display = 'none' }} />
                      <span className="nav-avatar-fallback nav-avatar-fallback--lg">{avatarLetter}</span>
                    </span>
                    <div className="nav-user-card-info">
                      <span className="nav-user-card-name">{user.user_metadata?.full_name || 'Usuario'}</span>
                      <span className="nav-user-card-email">{user.email}</span>
                    </div>
                  </div>
                  <div className="nav-user-card-divider" />
                  <button className="nav-user-card-item" onClick={() => { setSongFilter(''); setShowMySongs(true); setShowUserMenu(false) }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
                    Minhas musicas
                  </button>
                  <button className="nav-user-card-item nav-user-card-item--danger" onClick={() => { signOut(); setShowUserMenu(false) }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                    Sair
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <button className="nav-link" onClick={() => setShowLoginModal(true)}>Entrar</button>
              <Link to="/privacidade" className="nav-link">Privacidade</Link>
            </>
          )}
        </div>
      </nav>
      {externalShowColorPicker === undefined && (
        <ColorPickerModal
          show={showColorPicker}
          hue={pickerHue}
          onHueChange={handleHueChange}
          onApply={applyAccentColor}
          onReset={resetAccentColor}
          onClose={() => {
            const saved = localStorage.getItem('accent-color')
            document.documentElement.style.setProperty('--accent-color', saved || DEFAULT_ACCENT)
            setPickerHue(saved ? hexToHue(saved) : hexToHue(DEFAULT_ACCENT))
            setShowColorPicker(false)
          }}
        />
      )}
    </>
    )
  }

  // Desktop/Header nav rendering (não é mobile)
  return (
    <>
      <nav className="nav-links">
        {user && (
          <button className="nav-assine" onClick={() => setShowDomingoModal(true)}>Esse Domingo</button>
        )}
        <div className="nav-desktop-links">
          <button className="nav-link" onClick={() => { setSongFilter(''); setShowMySongs(true) }}>Louvores</button>
          <button className="nav-link" onClick={() => { fetchUserLists(user?.email).then(setUserLists); setShowListsModal(true) }}>Listas</button>
          {user && userIsAdmin && (
            <button className="nav-link" onClick={() => setShowAddModal(true)}>Adicionar</button>
          )}
          {user ? (
            <div className="nav-user" ref={userMenuRef}>
              <button className="nav-user-trigger" onClick={() => setShowUserMenu(v => !v)}>
                <span className="nav-avatar-wrap">
                  <img src={avatarUrl} alt="" className="nav-avatar" referrerPolicy="no-referrer" onLoad={e => { const fb = e.target.parentElement.querySelector('.nav-avatar-fallback'); if (fb) fb.style.display = 'none' }} onError={e => { e.target.style.display = 'none' }} />
                  <span className="nav-avatar-fallback">{avatarLetter}</span>
                </span>
                <span className="nav-username">{displayName}</span>
                <span className="nav-user-arrow">&#9662;</span>
              </button>
              {showUserMenu && (
                <div className="nav-user-card">
                  <div className="nav-user-card-header">
                    <span className="nav-avatar-wrap">
                      <img src={avatarUrl} alt="" className="nav-user-card-avatar" referrerPolicy="no-referrer" onLoad={e => { const fb = e.target.parentElement.querySelector('.nav-avatar-fallback'); if (fb) fb.style.display = 'none' }} onError={e => { e.target.style.display = 'none' }} />
                      <span className="nav-avatar-fallback nav-avatar-fallback--lg">{avatarLetter}</span>
                    </span>
                    <div className="nav-user-card-info">
                      <span className="nav-user-card-name">{user.user_metadata?.full_name || 'Usuario'}</span>
                      <span className="nav-user-card-email">{user.email}</span>
                    </div>
                  </div>
                  <div className="nav-user-card-divider" />
                  <button className="nav-user-card-item" onClick={() => { setSongFilter(''); setShowMySongs(true); setShowUserMenu(false) }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
                    Minhas musicas
                  </button>
                  {user && !userIsAdmin && (
                    <button className="nav-user-card-item" onClick={() => { fetchUserSuggestions(user.email).then(setUserSuggestions); setShowUserSuggestions(true); setShowUserMenu(false) }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                      Sugerir Louvor
                    </button>
                  )}
                  {user && userIsAdmin && (
                    <button className="nav-user-card-item" onClick={() => { fetchSuggestions().then(setSuggestions); setShowSuggestionsList(true); setShowUserMenu(false) }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><circle cx="9" cy="10" r="1"/><circle cx="12" cy="10" r="1"/><circle cx="15" cy="10" r="1"/></svg>
                      Sugestoes
                    </button>
                  )}
                  <button className="nav-user-card-item nav-user-card-item--danger" onClick={() => { signOut(); setShowUserMenu(false) }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                    Sair
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <button className="nav-link" onClick={() => setShowLoginModal(true)}>Entrar</button>
              <Link to="/privacidade" className="nav-link">Privacidade</Link>
            </>
          )}
        </div>
      </nav>
      {externalShowColorPicker === undefined && (
        <ColorPickerModal
          show={showColorPicker}
          hue={pickerHue}
          onHueChange={handleHueChange}
          onApply={applyAccentColor}
          onReset={resetAccentColor}
          onClose={() => {
            const saved = localStorage.getItem('accent-color')
            document.documentElement.style.setProperty('--accent-color', saved || DEFAULT_ACCENT)
            setPickerHue(saved ? hexToHue(saved) : hexToHue(DEFAULT_ACCENT))
            setShowColorPicker(false)
          }}
        />
      )}
    </>
  )
})

// Color picker modal
function ColorPickerModal({ show, hue, onHueChange, onApply, onReset, onClose }) {
  if (!show) return null

  const currentHex = hslToHex(hue, 0.85, 0.55)

  return (
    <div className="color-picker-overlay" onClick={onClose}>
      <div className="color-picker-modal" onClick={e => e.stopPropagation()}>
        <div className="color-picker-header">
          <h3 className="color-picker-title">Personalizar cor</h3>
          <button className="color-picker-close" onClick={onClose}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        <div className="color-picker-preview">
          <div className="color-picker-swatch" style={{ background: currentHex }} />
          <div>
            <div className="color-picker-hex">{currentHex}</div>
            <div className="color-picker-label" style={{ marginBottom: 0 }}>Cor dos destaques</div>
          </div>
        </div>

        <label className="color-picker-label">Matiz</label>
        <input
          type="range"
          className="color-picker-slider"
          min="0"
          max="360"
          value={hue}
          onChange={onHueChange}
        />

        <label className="color-picker-label">Sugestoes</label>
        <div className="color-picker-presets">
          {PRESET_COLORS.map(c => (
            <button
              key={c}
              className={`color-picker-preset${c === currentHex ? ' active' : ''}`}
              style={{ background: c }}
              onClick={() => {
                const h = hexToHue(c)
                onHueChange({ target: { value: h } })
              }}
            />
          ))}
        </div>

        <div className="color-picker-actions">
          <button className="color-picker-btn color-picker-btn-reset" onClick={onReset}>
            Restaurar padrao
          </button>
          <button className="color-picker-btn color-picker-btn-apply" onClick={onApply}>
            Aplicar
          </button>
        </div>
      </div>
    </div>
  )
}

export default Navbar
