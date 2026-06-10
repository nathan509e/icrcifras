import { useRef } from 'react'
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
  return (
    <nav className="nav-links">
      {user ? (
        <button className="nav-assine" onClick={() => setShowDomingoModal(true)}>Esse Domingo</button>
      ) : null}
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
    </nav>
  )
}