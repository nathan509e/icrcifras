import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchSongs, signInWithGoogle, signOut, onAuthChange, getCurrentUser, isAdmin, fetchUserLists, createList, updateList, deleteList, saveSuggestion, fetchUserSuggestions, fetchDomingoList } from '../supabase'

export default function MusicasPage() {
  const [songs, setSongs] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showSuggestionModal, setShowSuggestionModal] = useState(false)
  const [showListsModal, setShowListsModal] = useState(false)
  const [showCreateListModal, setShowCreateListModal] = useState(false)
  const [showEditListModal, setShowEditListModal] = useState(false)
  const [showPlaylistModal, setShowPlaylistModal] = useState(false)
  const [showDomingoModal, setShowDomingoModal] = useState(false)
  const [domingoList, setDomingoList] = useState(null)
  const [showUserSuggestions, setShowUserSuggestions] = useState(false)
  const [userSuggestions, setUserSuggestions] = useState([])
  const [suggSong, setSuggSong] = useState('')
  const [suggUrl, setSuggUrl] = useState('')
  const [user, setUser] = useState(null)
  const [userIsAdmin, setUserIsAdmin] = useState(false)
  const [userLists, setUserLists] = useState([])
  const [newListName, setNewListName] = useState('')
  const [selectedSongs, setSelectedSongs] = useState([])
  const [editingList, setEditingList] = useState(null)
  const [currentPlaylist, setCurrentPlaylist] = useState(null)
  const [currentPlaylistIndex, setCurrentPlaylistIndex] = useState(0)
  const navigate = useNavigate()
  const userMenuRef = useRef(null)

  useEffect(() => {
    fetchSongs().then(data => {
      setSongs(data || [])
      setLoading(false)
    })

    const storedPlaylist = sessionStorage.getItem('currentPlaylist')
    const storedIndex = sessionStorage.getItem('currentPlaylistIndex')
    if (storedPlaylist) {
      setCurrentPlaylist(JSON.parse(storedPlaylist))
      setCurrentPlaylistIndex(parseInt(storedIndex) || 0)
    }

    fetchDomingoList().then(data => setDomingoList(data))
  }, [])

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

  useEffect(() => {
    function handleClickOutside(e) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setShowUserMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const filteredSongs = songs.filter(song =>
    song.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleSongClick = (song) => {
    navigate(`/${song.id}`)
  }

  const handleCreateList = async () => {
    if (!newListName.trim() || !user?.email) return
    await createList(newListName.trim(), user.email, selectedSongs)
    setNewListName('')
    setSelectedSongs([])
    setShowCreateListModal(false)
    fetchUserLists(user.email).then(setUserLists)
  }

  const handleEditList = async () => {
    if (!editingList || !newListName.trim()) return
    await updateList(editingList.id, newListName.trim(), selectedSongs)
    setEditingList(null)
    setNewListName('')
    setSelectedSongs([])
    setShowEditListModal(false)
    fetchUserLists(user.email).then(setUserLists)
  }

  const handleDeleteList = async (id) => {
    await deleteList(id)
    fetchUserLists(user.email).then(setUserLists)
  }

  const openEditList = (list) => {
    setEditingList(list)
    setNewListName(list.name)
    setSelectedSongs(list.song_ids || [])
    setShowEditListModal(true)
  }

  const toggleSongSelection = (songId) => {
    setSelectedSongs(prev => 
      prev.includes(songId)
        ? prev.filter(id => id !== songId)
        : [...prev, songId]
    )
  }

  const getListSongs = (songIds) => {
    return songs.filter(s => songIds?.includes(s.id))
  }

  const avatarUrl = user?.user_metadata?.avatar_url || user?.user_metadata?.picture || ''
  const displayName = user?.user_metadata?.full_name || user?.email || ''
  const avatarLetter = displayName ? displayName[0].toUpperCase() : '?'

  if (loading) {
    return (
      <div className="page-wrapper">
        <header className="header">
          <div className="container header-inner">
            <h1 className="header-logo"><a href="/">Cifra Club</a></h1>
            <nav className="nav-links">
              <button className="nav-link" onClick={() => navigate('/musicas')}>Louvores</button>
              <button className="nav-link" onClick={() => setShowLoginModal(true)}>Entrar</button>
            </nav>
          </div>
        </header>
        <main>
          <div className="container">
            <div className="loading-spinner">Carregando musicas...</div>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="page-wrapper">
      <header className="header">
        <div className="container header-inner">
          <h1 className="header-logo"><a href="/">Cifra Club</a></h1>
          <div className="search-wrapper" style={{ flex: 1, maxWidth: 490 }}>
            <form className="search-form" onSubmit={e => e.preventDefault()}>
              <input
                className="search-input"
                placeholder="O que voce quer tocar hoje?"
                autoComplete="off"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </form>
          </div>
          <nav className="nav-links">
            {user ? (
              <button className="nav-assine" onClick={() => { setShowDomingoModal(true) }}>Esse Domingo</button>
            ) : null}
            <button className="nav-link" onClick={() => {}}>Louvores</button>
            <button className="nav-link" onClick={() => { setShowListsModal(true) }}>Listas</button>
            {user && !userIsAdmin && (
              <button className="nav-link" onClick={() => { fetchUserSuggestions(user.email).then(setUserSuggestions); setShowUserSuggestions(true) }}>Minhas sugestoes</button>
            )}
            {user && userIsAdmin && (
              <>
                <button className="nav-link" onClick={() => {}}>Sugestoes</button>
                <button className="nav-link" onClick={() => {}}>Adicionar</button>
              </>
            )}
            <button className="nav-link" onClick={() => setShowListsModal(true)}>Listas</button>
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
        </div>
      </header>

      <main>
        <div className="musicas-page">
          <div className="container">
            <header className="musicas-header">
              <h1>Louvores</h1>
              <p className="musicas-count">{songs.length} musicas disponiveis</p>
            </header>

            {filteredSongs.length === 0 ? (
              <div className="empty-state">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>
                </svg>
                <p>{searchQuery ? 'Nenhuma musica encontrada' : 'Nenhuma musica cadastrada'}</p>
                {searchQuery && <button className="btn-clear" onClick={() => setSearchQuery('')}>Limpar busca</button>}
              </div>
            ) : (
              <ul className="musicas-list">
                {filteredSongs.map(song => (
                  <li key={song.id} className="musica-item" onClick={() => handleSongClick(song)}>
                    <div className="musica-info">
                      <h3 className="musica-name">{song.name}</h3>
                      {song.composer && <span className="musica-composer">{song.composer}</span>}
                      {song.key && <span className="musica-key">Tom: {song.key}</span>}
                    </div>
                    <svg className="musica-arrow" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M5 12h14M12 5l7 7-7 7"/>
                    </svg>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </main>

      {showLoginModal && (
        <div className="modal-overlay" onClick={() => setShowLoginModal(false)}>
          <div className="modal modal-login" onClick={e => e.stopPropagation()}>
            <div className="modal-login-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="1.5"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
            </div>
            <h2 className="modal-title">Bem-vindo ao Cifras</h2>
            <p className="modal-login-desc">
              Este site e exclusivo para os membros do louvor da <strong>Igreja Caminho da Restauracao</strong>.
              Faca login com sua conta Google para acessar e gerenciar as cifras.
            </p>
            <button className="btn-google" onClick={() => { signInWithGoogle(); setShowLoginModal(false) }}>
              <svg viewBox="0 0 24 24" width="20" height="20"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
              Entrar com Google
            </button>
            <div className="modal-actions">
              <button className="modal-btn modal-btn-cancel" onClick={() => setShowLoginModal(false)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {showSuggestionModal && (
        <div className="modal-overlay" onClick={() => setShowSuggestionModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2 className="modal-title">Sugestao de louvor</h2>
            <div className="modal-body">
              <label className="modal-label">Nome da musica</label>
              <input
                className="modal-input"
                type="text"
                placeholder="Digite o nome da musica"
                value={suggSong}
                onChange={e => setSuggSong(e.target.value)}
                autoFocus
              />
              <label className="modal-label">Link do YouTube</label>
              <input
                className="modal-input"
                type="url"
                placeholder="https://youtube.com/watch?v=..."
                value={suggUrl}
                onChange={e => setSuggUrl(e.target.value)}
              />
            </div>
            <div className="modal-actions">
              <button className="modal-btn modal-btn-cancel" onClick={() => setShowSuggestionModal(false)}>Cancelar</button>
              <button
                className="modal-btn modal-btn-confirm"
                onClick={async () => {
                  const name = user?.user_metadata?.full_name || user?.email || ''
                  if (!name || !suggSong.trim() || !suggUrl.trim()) return
                  await saveSuggestion(name.trim(), suggSong.trim(), suggUrl.trim(), user?.email || '')
                  setShowSuggestionModal(false)
                  setSuggSong('')
                  setSuggUrl('')
                }}
                disabled={!suggSong.trim() || !suggUrl.trim()}
              >
                Enviar sugestao
              </button>
            </div>
          </div>
        </div>
      )}

      {showListsModal && (
        <div className="modal-overlay" onClick={() => setShowListsModal(false)}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
            <h2 className="modal-title">Minhas Listas</h2>
            <div className="modal-body">
              {!user ? (
                <p className="modal-text">Faca login para criar e visualizar suas listas.</p>
              ) : userLists.length === 0 ? (
                <p className="modal-text">Voce ainda nao tem nenhuma lista.</p>
              ) : (
                <div className="lists-list">
                  {userLists.map(list => (
                    <div key={list.id} className="list-item">
                      <button
                        className="list-item-name"
                        onClick={() => {
                          sessionStorage.setItem('currentPlaylist', JSON.stringify(list))
                          sessionStorage.setItem('currentPlaylistIndex', '0')
                          const firstSongId = list.song_ids?.[0]
                          if (firstSongId) {
                            navigate(`/${firstSongId}`)
                          }
                          setShowListsModal(false)
                        }}
                      >
                        {list.name}
                        <span className="list-item-count">({list.song_ids?.length || 0} musicas)</span>
                      </button>
                      <div className="list-item-actions">
                        <button className="list-edit-btn" onClick={() => openEditList(list)}>Editar</button>
                        <button className="list-delete-btn" onClick={() => handleDeleteList(list.id)}>Excluir</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="modal-actions">
              {user && (
                <button className="modal-btn modal-btn-confirm" onClick={() => {
                  setNewListName('')
                  setSelectedSongs([])
                  setShowCreateListModal(true)
                }}>
                  Criar nova lista
                </button>
              )}
              <button className="modal-btn modal-btn-cancel" onClick={() => setShowListsModal(false)}>Fechar</button>
            </div>
          </div>
        </div>
      )}

      {showCreateListModal && (
        <div className="modal-overlay" onClick={() => setShowCreateListModal(false)}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
            <h2 className="modal-title">Criar nova lista</h2>
            <div className="modal-body">
              <label className="modal-label">Nome da lista</label>
              <input
                className="modal-input"
                type="text"
                placeholder="Digite o nome da lista"
                value={newListName}
                onChange={e => setNewListName(e.target.value)}
                autoFocus
              />
              <label className="modal-label">Selecione as musicas</label>
              <div className="song-select-list">
                {songs.map(song => (
                  <label key={song.id} className="song-select-item">
                    <input
                      type="checkbox"
                      checked={selectedSongs.includes(song.id)}
                      onChange={() => toggleSongSelection(song.id)}
                    />
                    <span>{song.name}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="modal-actions">
              <button className="modal-btn modal-btn-cancel" onClick={() => setShowCreateListModal(false)}>Cancelar</button>
              <button
                className="modal-btn modal-btn-confirm"
                onClick={handleCreateList}
                disabled={!newListName.trim()}
              >
                Criar lista
              </button>
            </div>
          </div>
        </div>
      )}

      {showEditListModal && (
        <div className="modal-overlay" onClick={() => setShowEditListModal(false)}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
            <h2 className="modal-title">Editar lista</h2>
            <div className="modal-body">
              <label className="modal-label">Nome da lista</label>
              <input
                className="modal-input"
                type="text"
                placeholder="Digite o nome da lista"
                value={newListName}
                onChange={e => setNewListName(e.target.value)}
              />
              <label className="modal-label">Selecione as musicas</label>
              <div className="song-select-list">
                {songs.map(song => (
                  <label key={song.id} className="song-select-item">
                    <input
                      type="checkbox"
                      checked={selectedSongs.includes(song.id)}
                      onChange={() => toggleSongSelection(song.id)}
                    />
                    <span>{song.name}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="modal-actions">
              <button className="modal-btn modal-btn-cancel" onClick={() => setShowEditListModal(false)}>Cancelar</button>
              <button
                className="modal-btn modal-btn-confirm"
                onClick={handleEditList}
                disabled={!newListName.trim()}
              >
                Salvar alteracoes
              </button>
            </div>
          </div>
        </div>
      )}

      {showPlaylistModal && currentPlaylist && (
        <div className="modal-overlay" onClick={() => setShowPlaylistModal(false)}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
            <h2 className="modal-title">{currentPlaylist.name}</h2>
            <div className="modal-body">
              <div className="playlist-songs">
                {currentPlaylist.song_ids?.map((songId, index) => {
                  const song = songs.find(s => s.id === songId)
                  if (!song) return null
                  return (
                    <button
                      key={song.id}
                      className={`playlist-song-item ${index === currentPlaylistIndex ? 'active' : ''}`}
                      onClick={() => {
                        navigate(`/${song.id}`)
                        setCurrentPlaylistIndex(index)
                        setShowPlaylistModal(false)
                      }}
                    >
                      <span className="playlist-song-number">{index + 1}</span>
                      <span className="playlist-song-name">{song.name}</span>
                    </button>
                  )
                })}
              </div>
            </div>
              <div className="modal-actions">
              <button className="modal-btn modal-btn-cancel" onClick={() => setShowPlaylistModal(false)}>Fechar</button>
            </div>
          </div>
        </div>
      )}

      {showDomingoModal && (
        <div className="modal-overlay" onClick={() => setShowDomingoModal(false)}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
            <h2 className="modal-title">Esse Domingo</h2>
            <div className="modal-body">
              {userIsAdmin ? (
                <>
                  {domingoList ? (
                    <>
                      <p className="modal-text">Lista atual. Voce pode excluir e criar uma nova.</p>
                      <div className="playlist-songs">
                        {domingoList.song_ids?.map((songId, index) => {
                          const song = songs.find(s => s.id === songId)
                          if (!song) return null
                          return (
                            <div key={song.id} className="playlist-song-item" style={{ cursor: 'default' }}>
                              <span className="playlist-song-number">{index + 1}</span>
                              <span className="playlist-song-name">{song.name}</span>
                            </div>
                          )
                        })}
                      </div>
                    </>
                  ) : (
                    <>
                      <p className="modal-text">Selecione as musicas para o culto de domingo:</p>
                      <div className="song-select-list">
                        {songs.map(song => (
                          <label key={song.id} className="song-select-item">
                            <input
                              type="checkbox"
                              checked={selectedSongs.includes(song.id)}
                              onChange={() => setSelectedSongs(prev => prev.includes(song.id) ? prev.filter(id => id !== song.id) : [...prev, song.id])}
                            />
                            <span>{song.name}</span>
                          </label>
                        ))}
                      </div>
                    </>
                  )}
                </>
              ) : (
                <>
                  <p className="modal-text">Musicas do culto de domingo:</p>
                  {domingoList ? (
                    <div className="playlist-songs">
                      {domingoList.song_ids?.map((songId, index) => {
                        const song = songs.find(s => s.id === songId)
                        if (!song) return null
                        return (
                          <button
                            key={song.id}
                            className="playlist-song-item"
                            onClick={() => {
                              sessionStorage.setItem('currentPlaylist', JSON.stringify(domingoList))
                              sessionStorage.setItem('currentPlaylistIndex', index.toString())
                              navigate(`/${song.id}`)
                              setShowDomingoModal(false)
                            }}
                          >
                            <span className="playlist-song-number">{index + 1}</span>
                            <span className="playlist-song-name">{song.name}</span>
                          </button>
                        )
                      })}
                    </div>
                  ) : (
                    <p className="modal-text">Nenhuma lista agendada ainda.</p>
                  )}
                </>
              )}
            </div>
            <div className="modal-actions">
              <button className="modal-btn modal-btn-cancel" onClick={() => setShowDomingoModal(false)}>Fechar</button>
              {userIsAdmin && (
                <>
                  {domingoList ? (
                    <button
                      className="modal-btn modal-btn-danger"
                      onClick={async () => {
                        if (window.confirm('Tem certeza que deseja excluir a lista atual?')) {
                          await deleteList(domingoList.id)
                          setDomingoList(null)
                        }
                      }}
                    >
                      Excluir lista
                    </button>
                  ) : (
                    <button
                      className="modal-btn modal-btn-confirm"
                      onClick={async () => {
                        const newList = await createList('Esse Domingo', 'domingo@cifras', selectedSongs)
                        setDomingoList(newList)
                        setSelectedSongs([])
                        setShowDomingoModal(false)
                      }}
                      disabled={selectedSongs.length === 0}
                    >
                      Criar lista
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {showUserSuggestions && (
        <div className="modal-overlay" onClick={() => setShowUserSuggestions(false)}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
            <h2 className="modal-title">Minhas sugestoes</h2>
            <div className="modal-body">
              {userSuggestions.length === 0 ? (
                <p className="modal-empty">Nenhuma sugestao enviada.</p>
              ) : (
                <div className="suggestions-list">
                  {userSuggestions.map(s => {
                    const st = s.status === 'approved' ? { text: 'Aprovado', cls: 'status-approved' } : s.status === 'rejected' ? { text: 'Reprovado', cls: 'status-rejected' } : { text: 'Em analise', cls: 'status-pending' }
                    return (
                      <div key={s.id} className="suggestion-item">
                        <div className="suggestion-info">
                          <div className="suggestion-song-row">
                            <span className="suggestion-song">{s.song_name}</span>
                          </div>
                          <span className={`suggestion-status ${st.cls}`}>{st.text}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
            <div className="modal-actions">
              <button className="modal-btn modal-btn-confirm" onClick={() => { setShowUserSuggestions(false); setShowSuggestionModal(true) }}>Adicionar sugestao</button>
              <button className="modal-btn modal-btn-cancel" onClick={() => setShowUserSuggestions(false)}>Fechar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}