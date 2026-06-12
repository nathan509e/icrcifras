import { useRef, useState, useEffect } from 'react'
import { signOut, fetchUserLists, fetchSuggestions, fetchUserSuggestions } from '../supabase'

export default function Navbar({
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
}) {
  const [showInstallButton, setShowInstallButton] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState(null)

  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setShowInstallButton(true)
    }

    const handleAppInstalled = () => {
      setShowInstallButton(false)
      setDeferredPrompt(null)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  const handleInstallClick = async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      console.log('User accepted the install prompt')
    } else {
      console.log('User dismissed the install prompt')
    }
    setDeferredPrompt(null)
    setShowInstallButton(false)
  }

  const mobileBtnStyle = { display: 'flex', alignItems: 'center', justifyContent: 'center', width: 40, height: 40, borderRadius: 10, cursor: 'pointer', flexShrink: 0 }

  // Renderizar nav fixo em baixo quando está vendo uma cifra
  if (isViewingSong) {
    return (
      <>
        {/* Header com seta de voltar */}
        <div className="nav-song-header-mobile">
          <button
            onClick={() => navigate('/')}
            className="nav-back-btn"
            title="Voltar"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 40, height: 40, background: 'none', border: 'none', cursor: 'pointer', color: '#333' }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 19l-7-7 7-7"/></svg>
          </button>
        </div>
        
        {/* Nav fixo em baixo - desktop links mantidos */}
        <nav className="nav-links">
          {user && (
            <button className="nav-assine" onClick={() => setShowDomingoModal(true)}>Esse Domingo</button>
          )}
          <button
            className="nav-search-btn-mobile"
            onClick={() => { setSongFilter(''); setShowMySongs(true) }}
            title="Buscar musicas"
            style={{ ...mobileBtnStyle, background: '#017155', border: 'none', color: 'white' }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
          </button>
          {user && !userIsAdmin && (
            <button
              className="nav-suggestions-btn-mobile"
              onClick={() => { fetchUserSuggestions(user.email).then(setUserSuggestions); setShowUserSuggestions(true) }}
              title="Minhas sugestoes"
              style={{ ...mobileBtnStyle, background: '#017155', border: 'none', color: 'white' }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            </button>
          )}
          {user && userIsAdmin && (
            <button
              className="nav-admin-suggestions-btn-mobile"
              onClick={() => { fetchSuggestions().then(setSuggestions); setShowSuggestionsList(true) }}
              title="Sugestoes"
              style={{ ...mobileBtnStyle, background: '#017155', border: 'none', color: 'white' }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><circle cx="9" cy="10" r="1"/><circle cx="12" cy="10" r="1"/><circle cx="15" cy="10" r="1"/></svg>
            </button>
          )}
          {showInstallButton && (
            <button
              className="nav-install-btn-mobile"
              onClick={handleInstallClick}
              title="Instalar app"
              style={{ ...mobileBtnStyle, background: '#017155', border: 'none', color: 'white' }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            </button>
          )}
          <div className="nav-desktop-links">
            <button className="nav-link" onClick={() => { setSongFilter(''); setShowMySongs(true) }}>Louvores</button>
            <button className="nav-link" onClick={() => { fetchUserLists(user?.email).then(setUserLists); setShowListsModal(true) }}>Listas</button>
            {user && !userIsAdmin && (
              <button className="nav-link" onClick={() => { fetchUserSuggestions(user.email).then(setUserSuggestions); setShowUserSuggestions(true) }}>Minhas sugestoes</button>
            )}
            {user && userIsAdmin && (
              <>
                <button className="nav-link" onClick={() => { fetchSuggestions().then(setSuggestions); setShowSuggestionsList(true) }}>Sugestoes</button>
                <button className="nav-link" onClick={() => setShowAddModal(true)}>Adicionar</button>
              </>
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
              <button className="nav-link" onClick={() => setShowLoginModal(true)}>Entrar</button>
            )}
          </div>
        </nav>
      </>
    )
  }

  // Renderizar nav mobile em baixo quando está na tela inicial
  return (
    <nav className="nav-links nav-home-mobile">
      {user && (
        <button
          className="nav-mobile-bottom-btn"
          onClick={() => setShowDomingoModal(true)}
          title="Esse Domingo"
          style={{ ...mobileBtnStyle, background: '#017155', border: 'none', color: 'white' }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
        </button>
      )}
      {user && !userIsAdmin && (
        <button
          className="nav-mobile-bottom-btn"
          onClick={() => { fetchUserSuggestions(user.email).then(setUserSuggestions); setShowUserSuggestions(true) }}
          title="Minhas sugestoes"
          style={{ ...mobileBtnStyle, background: '#017155', border: 'none', color: 'white' }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
        </button>
      )}
      {user && userIsAdmin && (
        <button
          className="nav-mobile-bottom-btn"
          onClick={() => { fetchSuggestions().then(setSuggestions); setShowSuggestionsList(true) }}
          title="Sugestoes"
          style={{ ...mobileBtnStyle, background: '#017155', border: 'none', color: 'white' }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><circle cx="9" cy="10" r="1"/><circle cx="12" cy="10" r="1"/><circle cx="15" cy="10" r="1"/></svg>
        </button>
      )}
      {user && (
        <button
          className="nav-mobile-bottom-btn"
          onClick={() => setShowUserMenu(!showUserMenu)}
          title="Perfil"
          style={{ ...mobileBtnStyle, background: '#017155', border: 'none', color: 'white' }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
        </button>
      )}
      {!user && (
        <button
          className="nav-mobile-bottom-btn"
          onClick={() => setShowLoginModal(true)}
          title="Entrar"
          style={{ ...mobileBtnStyle, background: '#017155', border: 'none', color: 'white' }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>
        </button>
      )}
      
      {/* Menu do usuário que abre ao clicar no perfil */}
      {showUserMenu && user && (
        <div className="nav-mobile-user-menu">
          <button
            onClick={() => { setSongFilter(''); setShowMySongs(true); setShowUserMenu(false) }}
            className="nav-mobile-menu-item"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
            Minhas Musicas
          </button>
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
        {user && !userIsAdmin && (
          <button className="nav-link" onClick={() => { fetchUserSuggestions(user.email).then(setUserSuggestions); setShowUserSuggestions(true) }}>Minhas sugestoes</button>
        )}
        {user && userIsAdmin && (
          <>
            <button className="nav-link" onClick={() => { fetchSuggestions().then(setSuggestions); setShowSuggestionsList(true) }}>Sugestoes</button>
            <button className="nav-link" onClick={() => setShowAddModal(true)}>Adicionar</button>
          </>
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
          <button className="nav-link" onClick={() => setShowLoginModal(true)}>Entrar</button>
        )}
      </div>
    </nav>
  )
}