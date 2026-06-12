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
}) {
  const [showInstallButton, setShowInstallButton] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [showMobileMenu, setShowMobileMenu] = useState(false)
  const mobileMenuRef = useRef(null)

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

  return (
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
       {user && (
         <div style={{ position: 'relative' }} ref={mobileMenuRef}>
           <button
             className="nav-more-menu-btn-mobile"
             onClick={() => setShowMobileMenu(!showMobileMenu)}
             title="Mais opcoes"
             style={{ ...mobileBtnStyle, background: '#017155', border: 'none', color: 'white' }}
           >
             <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/></svg>
           </button>
           {showMobileMenu && (
             <div style={{
               position: 'absolute',
               top: '100%',
               right: 0,
               background: 'white',
               border: '1px solid #e0e0e0',
               borderRadius: 8,
               marginTop: 8,
               minWidth: 200,
               boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
               zIndex: 1000
             }}>
               <button
                 onClick={() => { setShowUserMenu(true); setShowMobileMenu(false) }}
                 style={{
                   width: '100%',
                   padding: '12px 16px',
                   border: 'none',
                   background: 'none',
                   textAlign: 'left',
                   cursor: 'pointer',
                   fontSize: '14px',
                   color: '#333',
                   borderBottom: '1px solid #e0e0e0',
                   display: 'flex',
                   alignItems: 'center',
                   gap: '8px'
                 }}
               >
                 <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                 Meu Perfil
               </button>
               {user && userIsAdmin && (
                 <button
                   onClick={() => { setShowAddModal(true); setShowMobileMenu(false) }}
                   style={{
                     width: '100%',
                     padding: '12px 16px',
                     border: 'none',
                     background: 'none',
                     textAlign: 'left',
                     cursor: 'pointer',
                     fontSize: '14px',
                     color: '#333',
                     borderBottom: '1px solid #e0e0e0',
                     display: 'flex',
                     alignItems: 'center',
                     gap: '8px'
                   }}
                 >
                   <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                   Adicionar
                 </button>
               )}
               <button
                 onClick={() => { fetchUserLists(user?.email).then(setUserLists); setShowListsModal(true); setShowMobileMenu(false) }}
                 style={{
                   width: '100%',
                   padding: '12px 16px',
                   border: 'none',
                   background: 'none',
                   textAlign: 'left',
                   cursor: 'pointer',
                   fontSize: '14px',
                   color: '#333',
                   borderBottom: '1px solid #e0e0e0',
                   display: 'flex',
                   alignItems: 'center',
                   gap: '8px'
                 }}
               >
                 <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2z"/><polyline points="17 7 7 7 7 12 17 12 17 19 7 19"/></svg>
                 Listas
               </button>
               <button
                 onClick={() => { signOut(); setShowMobileMenu(false) }}
                 style={{
                   width: '100%',
                   padding: '12px 16px',
                   border: 'none',
                   background: 'none',
                   textAlign: 'left',
                   cursor: 'pointer',
                   fontSize: '14px',
                   color: '#d32f2f',
                   display: 'flex',
                   alignItems: 'center',
                   gap: '8px'
                 }}
               >
                 <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                 Sair
               </button>
             </div>
           )}
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