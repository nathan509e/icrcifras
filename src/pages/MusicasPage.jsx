import { useState, useEffect, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { fetchSongs, signOut, fetchUserLists, createList, updateList, deleteList, saveSuggestion, fetchUserSuggestions, fetchDomingoList, fetchSuggestions, saveSong, deleteSuggestion, updateSuggestionStatus, createUser, signInWithEmail, signInWithGoogle } from '../supabase'
import { useAuth } from '../AuthContext'
import Navbar from '../components/Navbar'
import appLogo from '../../icons/icon-128.webp'

const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
const KEYS = NOTES.flatMap(n => [n, n + 'm'])

function parseSongIdItem(item) {
  if (!item) return null
  if (typeof item === 'object') return item
  try {
    const parsed = JSON.parse(item)
    if (parsed && typeof parsed === 'object') {
      return parsed
    }
  } catch (e) {
    // Not JSON
  }
  return { songId: item, tom: null }
}

function safeParseJson(value, fallback = null) {
  if (!value) return fallback
  try {
    return JSON.parse(value)
  } catch (error) {
    return fallback
  }
}

export default function MusicasPage() {
  const [songs, setSongs] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [showSearchResults, setShowSearchResults] = useState(false)
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [showEmailForm, setShowEmailForm] = useState(false)
  const [showSignupForm, setShowSignupForm] = useState(false)
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [signupEmail, setSignupEmail] = useState('')
  const [signupPassword, setSignupPassword] = useState('')
  const [signupName, setSignupName] = useState('')
  const [loginError, setLoginError] = useState('')
  const [signupError, setSignupError] = useState('')
  const [signupLoading, setSignupLoading] = useState(false)
  const [loginLoading, setLoginLoading] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showSuggestionModal, setShowSuggestionModal] = useState(false)
  const [showSuggestionsList, setShowSuggestionsList] = useState(false)
  const [showListsModal, setShowListsModal] = useState(false)
  const [showCreateListModal, setShowCreateListModal] = useState(false)
  const [showEditListModal, setShowEditListModal] = useState(false)
  const [showPlaylistModal, setShowPlaylistModal] = useState(false)
  const [showDomingoModal, setShowDomingoModal] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [domingoList, setDomingoList] = useState(null)
  const [selectedLocation, setSelectedLocation] = useState(null)
  const [loadingDomingo, setLoadingDomingo] = useState(false)
  const [isEditingDomingo, setIsEditingDomingo] = useState(false)
  const [showUserSuggestions, setShowUserSuggestions] = useState(false)
  const [userSuggestions, setUserSuggestions] = useState([])
  const [suggestions, setSuggestions] = useState([])
  const [suggSong, setSuggSong] = useState('')
  const [suggUrl, setSuggUrl] = useState('')
  const { user, setUser, userIsAdmin, setUserIsAdmin, userLists, setUserLists } = useAuth()

  useEffect(() => {
    if (user) {
      setShowLoginModal(false)
      setShowEmailForm(false)
      setShowSignupForm(false)
    }
  }, [user])

  const [newListName, setNewListName] = useState('')
  const [selectedSongs, setSelectedSongs] = useState([])
  const [editingList, setEditingList] = useState(null)
  const [isSundayType, setIsSundayType] = useState(false)
  const [sundayLocationSelection, setSundayLocationSelection] = useState('Guarulhos')
  const [modalSearchQuery, setModalSearchQuery] = useState('')
  const [currentPlaylist, setCurrentPlaylist] = useState(null)
  const [currentPlaylistIndex, setCurrentPlaylistIndex] = useState(0)
  const [showMySongs, setShowMySongs] = useState(false)
  const [songFilter, setSongFilter] = useState('')
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('theme') === 'dark')
  const [newSongName, setNewSongName] = useState('')
  const [newSongComposer, setNewSongComposer] = useState('')
  const [newSongFile, setNewSongFile] = useState(null)
  const [newSongFileGuitar, setNewSongFileGuitar] = useState(null)
  const [newSongYoutubeUrl, setNewSongYoutubeUrl] = useState('')
  const [importUrl, setImportUrl] = useState('')
  const [importLoading, setImportLoading] = useState(false)
  const [importHtml, setImportHtml] = useState('')
  const [showImportHtml, setShowImportHtml] = useState(false)
  const [activeView, setActiveView] = useState('menu')
  const fileInputRef = useRef(null)
  const fileInputGuitarRef = useRef(null)
  const navigate = useNavigate()
  const userMenuRef = useRef(null)

  useEffect(() => {
    fetchSongs().then(data => {
      const sorted = (data || []).sort((a, b) => a.name.localeCompare(b.name, 'pt', { sensitivity: 'base' }))
      setSongs(sorted)
    }).catch(err => {
      console.error('Error fetching songs:', err)
    }).finally(() => {
      setLoading(false)
    })

    const storedPlaylist = sessionStorage.getItem('currentPlaylist')
    const storedIndex = sessionStorage.getItem('currentPlaylistIndex')
    if (storedPlaylist) {
      setCurrentPlaylist(safeParseJson(storedPlaylist))
      setCurrentPlaylistIndex(parseInt(storedIndex) || 0)
    }
  }, [])

  useEffect(() => {
    if (!showDomingoModal) {
      setSelectedLocation(null)
      setDomingoList(null)
      setSelectedSongs([])
      setIsEditingDomingo(false)
    }
  }, [showDomingoModal])

  useEffect(() => {
    if (!showCreateListModal) {
      setIsSundayType(false)
      setSundayLocationSelection('Guarulhos')
    }
  }, [showCreateListModal])

  useEffect(() => {
    if (showEditListModal && editingList) {
      if (editingList.name.startsWith('Esse Domingo - ')) {
        setIsSundayType(true)
        setSundayLocationSelection(editingList.name.replace('Esse Domingo - ', ''))
      } else {
        setIsSundayType(false)
        setSundayLocationSelection('Guarulhos')
      }
    }
  }, [showEditListModal, editingList])

  useEffect(() => {
    if (!showCreateListModal) {
      setModalSearchQuery('')
    }
  }, [showCreateListModal])

  useEffect(() => {
    if (!showEditListModal) {
      setModalSearchQuery('')
    }
  }, [showEditListModal])

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', darkMode ? '#000000' : '#fbb134')
  }, [darkMode])

  useEffect(() => {
    document.documentElement.style.setProperty('--accent-color', '#fbb134')
  }, [])

  useEffect(() => {
    function handleClickOutside(e) {
      const clickedDesktopMenu = userMenuRef.current?.contains(e.target)
      const clickedMobileTrigger = e.target.closest('.nav-mobile-bottom-btn')
      const clickedMobileMenu = e.target.closest('.nav-mobile-user-menu')
      
      if (!clickedDesktopMenu && !clickedMobileTrigger && !clickedMobileMenu) {
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

  function detectKey(textContent) {
    if (!textContent) return 'G'
    const rawText = textContent.replace(/<[^>]+>/g, '')
    const tomMatch = rawText.match(/(?:^|\n|\b)[Tt]om\s*:\s*([A-Ga-g][#b]?m?)/i)
    if (tomMatch) {
      const rawKey = tomMatch[1]
      const root = rawKey.charAt(0).toUpperCase()
      const rest = rawKey.slice(1)
      return root + rest
    }
    const chords = rawText.match(/\b([A-Ga-g][#b]?m?)(?=\s|$|\s*[\/\(\)\[\d]|M|dim|aug|sus|add|°|7)/gi)
    if (!chords || chords.length === 0) return 'G'
    const counts = {}
    const seen = []
    for (const c of chords) {
      const norm = c.charAt(0).toUpperCase() + c.slice(1)
      if (!counts[norm]) { counts[norm] = 0; seen.push(norm) }
      counts[norm]++
    }
    let best = seen[0], bestCount = counts[best]
    for (const c of seen) {
      if (counts[c] > bestCount) { best = c; bestCount = counts[c] }
    }
    return best
  }

  function getEffectiveSongKey(song) {
    if (!song) return 'G'
    const content = song.content || song.content_guitar || ''
    if (content) {
      const detected = detectKey(content)
      if (detected) return detected
    }
    return song.key || 'G'
  }

  const handleAddSong = async () => {
    if (!newSongName.trim() || (!newSongFile && !newSongFileGuitar)) return
    let content = ''
    if (newSongFile) content = await newSongFile.text()
    let contentGuitar = ''
    if (newSongFileGuitar) contentGuitar = await newSongFileGuitar.text()
    const detectedKey = detectKey(content || contentGuitar)
    const saved = await saveSong(newSongName.trim(), content, newSongYoutubeUrl.trim(), newSongComposer.trim(), detectedKey, contentGuitar)
    if (saved) {
      setSongs(prev => [saved, ...prev])
      setShowAddModal(false)
      setNewSongName('')
      setNewSongComposer('')
      setNewSongFile(null)
      setNewSongFileGuitar(null)
      setNewSongYoutubeUrl('')
      setImportUrl('')
      setImportHtml('')
      setShowImportHtml(false)
    }
  }

  const CORS_PROXIES = [
    (url) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
    (url) => `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`,
    (url) => `https://corsproxy.org/?${encodeURIComponent(url)}`,
    (url) => `https://r.jina.ai/${encodeURIComponent(url)}`,
  ]

  const parseCifraHtml = (html) => {
    const parser = new DOMParser()
    const doc = parser.parseFromString(html, 'text/html')

    const tomSpan = doc.querySelector('#cifra_tom')
    const tom = tomSpan ? tomSpan.textContent.trim() : ''

    const pre = doc.querySelector('pre')
    if (!pre) return null

    let cifraContent = pre.textContent || pre.innerHTML
    cifraContent = cifraContent.replace(/<br\s*\/?>/gi, '\n').replace(/<\/?[^>]+(>|$)/g, '')
    cifraContent = cifraContent.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim()
    if (tom) cifraContent = `Tom: ${tom}\n\n${cifraContent}`

    const title = doc.title || ''
    const songName = title
      .replace(/ - Cifra Club$/, '')
      .replace(/^Cifra Club - /, '')
      .replace(/ \(cifra.*\)$/i, '')
      .trim() || ''

    return { songName, cifraContent }
  }

  const applyImportResult = (songName, cifraContent) => {
    const blob = new Blob([cifraContent], { type: 'text/plain' })
    const file = new File([blob], `${songName || 'musica'}.txt`, { type: 'text/plain' })
    setNewSongName(songName)
    setNewSongFile(file)
    setImportUrl('')
    setImportHtml('')
    setShowImportHtml(false)
  }

  const handleImportFromUrl = async () => {
    if (!importUrl.trim()) return
    setImportLoading(true)
    try {
      let html = ''
      for (const proxy of CORS_PROXIES) {
        try {
          const proxyUrl = proxy(importUrl)
          const res = await fetch(proxyUrl, { signal: AbortSignal.timeout(15000) })
          if (res.ok) {
            const text = await res.text()
            if (text.includes('<pre') || text.includes('cifra_tom') || text.includes('cifra_club')) {
              html = text; break
            }
            try {
              const json = JSON.parse(text)
              if (json.contents) html = json.contents
              else html = text; break
            } catch { html = text; break }
          }
        } catch { continue }
      }
      if (html) {
        const result = parseCifraHtml(html)
        if (result && result.cifraContent) {
          applyImportResult(result.songName, result.cifraContent)
          alert('Cifra importada com sucesso! Preencha o compositor (opcional) e clique em Salvar.')
          setImportLoading(false)
          return
        }
      }
      setShowImportHtml(true)
      alert('Nao foi possivel acessar a URL automaticamente. Cole o codigo fonte da pagina no campo abaixo.')
    } catch (err) {
      setShowImportHtml(true)
      alert('Erro ao importar: ' + err.message)
    }
    setImportLoading(false)
  }

  const handleImportFromHtml = () => {
    if (!importHtml.trim()) return
    const result = parseCifraHtml(importHtml)
    if (!result || !result.cifraContent) {
      alert('Nao foi possivel encontrar a cifra no HTML colado. Certifique-se de copiar o codigo fonte completo da pagina.')
      return
    }
    applyImportResult(result.songName, result.cifraContent)
    alert('Cifra importada com sucesso! Preencha o compositor (opcional) e clique em Salvar.')
  }

  const getYoutubeId = (url) => {
    if (!url) return ''
    const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/)
    return match ? match[1] : ''
  }

  function statusLabel(s) {
    if (s === 'approved') return { text: 'Aprovado', cls: 'status-approved' }
    if (s === 'rejected') return { text: 'Reprovado', cls: 'status-rejected' }
    return { text: 'Em analise', cls: 'status-pending' }
  }

  const handleCreateList = async () => {
    if (!isSundayType && !newListName.trim()) return
    if (!user?.email) return
    const finalName = isSundayType ? `Esse Domingo - ${sundayLocationSelection}` : newListName.trim()
    await createList(finalName, user.email, selectedSongs)
    setNewListName('')
    setSelectedSongs([])
    setIsSundayType(false)
    setShowCreateListModal(false)
    fetchUserLists(user.email).then(setUserLists)
  }

  const handleEditList = async () => {
    if (!editingList) return
    if (!isSundayType && !newListName.trim()) return
    const finalName = isSundayType ? `Esse Domingo - ${sundayLocationSelection}` : newListName.trim()
    await updateList(editingList.id, finalName, selectedSongs)
    setEditingList(null)
    setNewListName('')
    setSelectedSongs([])
    setIsSundayType(false)
    setShowEditListModal(false)
    fetchUserLists(user.email).then(setUserLists)
  }

  const handleDeleteList = async (id) => {
    await deleteList(id)
    fetchUserLists(user.email).then(setUserLists)
  }

  const handleSaveDomingoList = async () => {
    if (!domingoList || !selectedLocation) return
    await updateList(domingoList.id, 'Esse Domingo - ' + selectedLocation, selectedSongs)
    setDomingoList({ ...domingoList, song_ids: selectedSongs })
    setSelectedSongs([])
  }

  const openEditList = (list) => {
    setEditingList(list)
    setNewListName(list.name)
    setSelectedSongs(list.song_ids || [])
    setShowEditListModal(true)
  }

  const getListSongs = (songIds) => {
    return songs.filter(s => songIds?.includes(s.id))
  }

  const avatarUrl = user?.user_metadata?.avatar_url || user?.user_metadata?.picture || ''
  const displayName = user?.user_metadata?.full_name || user?.email || ''
  const avatarLetter = displayName ? displayName[0].toUpperCase() : '?'

  const searchResults = searchQuery.trim()
    ? songs.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : []

  const loadSongContent = (id) => {
    navigate(`/${id}`)
    setShowSearchResults(false)
    setSearchQuery('')
  }

  const requestDelete = (id) => {
    // This is handled in the list modals
    console.log('Request delete:', id)
  }

  if (loading) {
    return (
      <div className="full-screen-loader">
        <div className="loading-spinner"></div>
      </div>
    )
  }

  return (
    <div className="page-wrapper">
      <header className="header">
        <div className="container header-inner">
          <h1 className="header-logo"><Link to="/">Cifra Club</Link></h1>
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
          <Navbar
            user={user}
            userIsAdmin={userIsAdmin}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            showSearchResults={showSearchResults}
            setShowSearchResults={setShowSearchResults}
            searchResults={[]}
            loadSongContent={() => {}}
            requestDelete={() => {}}
            showDomingoModal={showDomingoModal}
            setShowDomingoModal={setShowDomingoModal}
            showMySongs={showMySongs}
            setShowMySongs={setShowMySongs}
            songFilter={songFilter}
            setSongFilter={setSongFilter}
            showListsModal={showListsModal}
            setShowListsModal={setShowListsModal}
            userLists={userLists}
            setUserLists={setUserLists}
            showUserSuggestions={showUserSuggestions}
            setShowUserSuggestions={setShowUserSuggestions}
            userSuggestions={userSuggestions}
            setUserSuggestions={setUserSuggestions}
            showSuggestionsList={showSuggestionsList}
            setShowSuggestionsList={setShowSuggestionsList}
            suggestions={suggestions}
            setSuggestions={setSuggestions}
            showAddModal={showAddModal}
            setShowAddModal={setShowAddModal}
            showLoginModal={showLoginModal}
            setShowLoginModal={setShowLoginModal}
            userMenuRef={userMenuRef}
            showUserMenu={showUserMenu}
            setShowUserMenu={setShowUserMenu}
            avatarUrl={avatarUrl}
            displayName={displayName}
            avatarLetter={avatarLetter}
          />
        </div>
      </header>

      <div className="musicas-mobile-header">
        <img src={darkMode ? "/logowhite.png" : "/pwa-512x512.png"} alt="Cifra Club" className="musicas-mobile-logo" />
        <div className="musicas-mobile-actions">
          <button
            className="musicas-mobile-theme-btn"
            onClick={() => {
              setDarkMode(v => {
                const next = !v
                localStorage.setItem('theme', next ? 'dark' : 'light')
                return next
              })
            }}
            title="Alternar tema"
          >
            {darkMode ? (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
            ) : (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
            )}
          </button>
          <button
            className="musicas-mobile-search-btn"
            onClick={() => setShowMySongs(true)}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
          </button>
        </div>
      </div>

      <main>
        <div className="musicas-page">
          <div className="container">
            {activeView === 'menu' ? (
              <div className="menu-container">
                <header className="musicas-header text-center" style={{ textAlign: 'center', marginBottom: '40px' }}>
                  <h1 style={{ fontSize: '32px', marginBottom: '12px' }}>Louvor Restauração</h1>
                  <p className="musicas-count" style={{ fontSize: '16px' }}>O que vamos tocar hoje?</p>
                </header>

                <div className="menu-grid">
                  <button className="menu-card card-domingo" onClick={() => setShowDomingoModal(true)}>
                    <div className="menu-card-icon">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                    </div>
                    <div className="menu-card-info">
                      <h3>Esse Domingo</h3>
                      <p>Lista de louvores do culto de domingo</p>
                    </div>
                  </button>

                  <button className="menu-card card-louvores" onClick={() => setActiveView('songs')}>
                    <div className="menu-card-icon">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
                    </div>
                    <div className="menu-card-info">
                      <h3>Louvores</h3>
                      <p>Acesse todas as cifras disponíveis</p>
                    </div>
                  </button>

                  <button className="menu-card card-listas" onClick={() => {
                    if (!user) {
                      setShowLoginModal(true)
                    } else {
                      fetchUserLists(user.email).then(setUserLists)
                      setShowListsModal(true)
                    }
                  }}>
                    <div className="menu-card-icon">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>
                    </div>
                    <div className="menu-card-info">
                      <h3>Listas</h3>
                      <p>Visualize e organize seus repertórios</p>
                    </div>
                  </button>

                  {userIsAdmin ? (
                    <button className="menu-card card-sugestoes" onClick={() => {
                      if (!user) {
                        setShowLoginModal(true)
                      } else {
                        fetchSuggestions().then(setSuggestions)
                        setShowSuggestionsList(true)
                      }
                    }}>
                      <div className="menu-card-icon">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><circle cx="9" cy="10" r="1"/><circle cx="12" cy="10" r="1"/><circle cx="15" cy="10" r="1"/></svg>
                      </div>
                      <div className="menu-card-info">
                        <h3>Sugestões</h3>
                        <p>Gerencie sugestões de louvores enviados</p>
                      </div>
                    </button>
                  ) : (
                    <button className="menu-card card-sugerir" onClick={() => {
                      if (!user) {
                        setShowLoginModal(true)
                      } else {
                        fetchUserSuggestions(user.email).then(setUserSuggestions)
                        setShowUserSuggestions(true)
                      }
                    }}>
                      <div className="menu-card-icon">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                      </div>
                      <div className="menu-card-info">
                        <h3>Sugerir Louvor</h3>
                        <p>Envie sugestões de novos louvores</p>
                      </div>
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <>
                <button
                  className="back-link"
                  onClick={() => setActiveView('menu')}
                  style={{
                    cursor: 'pointer',
                    background: 'none',
                    border: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    color: 'var(--accent-color, #fbb134)',
                    fontWeight: '600',
                    marginBottom: '24px',
                    fontSize: '15px',
                    padding: '0'
                  }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M19 12H5M12 19l-7-7 7-7"/>
                  </svg>
                  Voltar ao menu
                </button>

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
                        </div>
                        <svg className="musica-arrow" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M5 12h14M12 5l7 7-7 7"/>
                        </svg>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </div>
        </div>
      </main>

      {showMySongs && (
        <div className="modal-overlay" onClick={() => setShowMySongs(false)}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
            <h2 className="modal-title">Louvores</h2>
            <div className="modal-body">
              <div className="song-filter-wrap">
                <svg className="song-filter-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
                <input
                  className="song-filter-input"
                  type="text"
                  placeholder="Buscar musica..."
                  value={songFilter}
                  onChange={e => setSongFilter(e.target.value)}
                  autoFocus
                />
              </div>
              {songs.filter(s => s.name.toLowerCase().includes(songFilter.toLowerCase())).length === 0 ? (
                <p className="modal-empty">Nenhuma musica encontrada.</p>
              ) : (
                <div className="my-songs-list">
                  {songs.filter(s => s.name.toLowerCase().includes(songFilter.toLowerCase())).map(song => (
                    <div key={song.id} className="my-song-item">
                      <button
                        className="my-song-name"
                        onClick={() => {
                          navigate(`/${song.id}`)
                          setShowMySongs(false)
                        }}
                      >
                        <span className="my-song-title">{song.name}</span>
                        {song.composer && <span className="my-song-composer">{song.composer}</span>}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="modal-actions">
              <button className="modal-btn modal-btn-cancel" onClick={() => setShowMySongs(false)}>Fechar</button>
            </div>
          </div>
        </div>
      )}

      {showLoginModal && (
        <div className="modal-overlay" onClick={() => { setShowLoginModal(false); setShowEmailForm(false); setShowSignupForm(false) }}>
          <div className="modal modal-login" onClick={e => e.stopPropagation()}>
            {!showEmailForm ? (
              <>
                <div className="modal-login-icon" style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
                  <img src={appLogo} alt="Logo" style={{ width: '48px', height: '48px', borderRadius: '12px' }} />
                </div>
                <h2 className="modal-title">Bem-vindo ao Cifras</h2>
                <p className="modal-login-desc">
                  Este site e exclusivo para os membros do louvor da <strong>Igreja Caminho da Restauracao</strong>.
                  Faca login com email/senha para acessar e gerenciar as cifras.
                </p>
                <button className="btn-signup" onClick={() => setShowEmailForm(true)}>
                  Entrar com E-mail
                </button>
                <button className="btn-signup btn-signup-secondary" onClick={() => { setShowEmailForm(true); setShowSignupForm(true) }}>
                  Criar conta
                </button>
                <button
                  className="btn-google"
                  onClick={async () => {
                    try {
                      await signInWithGoogle()
                    } catch (err) {
                      console.error('Google login error:', err)
                    }
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                  </svg>
                  Entrar com o Google
                </button>
                <div className="modal-actions">
                  <button className="modal-btn modal-btn-cancel" onClick={() => setShowLoginModal(false)}>Cancelar</button>
                </div>
              </>
            ) : showSignupForm ? (
              <>
                <div className="modal-login-icon">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="1.5"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>
                </div>
                <h2 className="modal-title">Criar conta</h2>
                <div className="modal-body">
                  <label className="modal-label">Nome</label>
                  <input
                    className="modal-input"
                    type="text"
                    placeholder="Seu nome"
                    value={signupName}
                    onChange={e => setSignupName(e.target.value)}
                    autoFocus
                  />
                  <label className="modal-label">Email</label>
                  <input
                    className="modal-input"
                    type="email"
                    placeholder="seu@email.com"
                    value={signupEmail}
                    onChange={e => setSignupEmail(e.target.value)}
                  />
                  <label className="modal-label">Senha</label>
                  <input
                    className="modal-input"
                    type="password"
                    placeholder="********"
                    value={signupPassword}
                    onChange={e => setSignupPassword(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') document.getElementById('btn-criar-mp').click() }}
                  />
                  {signupError && <p className="modal-error">{signupError}</p>}
                </div>
                <div className="modal-actions">
                  <button className="modal-btn modal-btn-cancel" onClick={() => { setShowSignupForm(false); setSignupError(''); setSignupEmail(''); setSignupPassword(''); setSignupName('') }}>Voltar</button>
                  <button
                    id="btn-criar-mp"
                    className="modal-btn modal-btn-confirm"
                    disabled={!signupEmail.trim() || !signupPassword || !signupName.trim() || signupLoading}
                    onClick={async () => {
                      setSignupLoading(true)
                      setSignupError('')
                      try {
                        const { data, error } = await createUser(signupEmail.trim(), signupPassword, signupName.trim())
                        if (error) {
                          if (error.message?.includes('User already registered')) {
                            throw new Error('Email ja cadastrado. Use outro email ou faca login.')
                          }
                          throw error
                        }
                        if (data?.session) {
                          setShowLoginModal(false)
                          setShowEmailForm(false)
                          setShowSignupForm(false)
                          setSignupEmail('')
                          setSignupPassword('')
                          setSignupName('')
                        } else {
                          setSignupError('Conta criada! Verifique seu email para confirmar o cadastro.')
                          setTimeout(() => {
                            setShowSignupForm(false)
                          }, 2000)
                        }
                      } catch (err) {
                        setSignupError(err.message || 'Erro ao criar conta')
                      } finally {
                        setSignupLoading(false)
                      }
                    }}
                  >
                    {signupLoading ? 'Criando...' : 'Criar conta'}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="modal-login-icon">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="1.5"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/></svg>
                </div>
                <h2 className="modal-title">Entrar</h2>
                <div className="modal-body">
                  <label className="modal-label">Email</label>
                  <input
                    className="modal-input"
                    type="email"
                    placeholder="seu@email.com"
                    value={loginEmail}
                    onChange={e => setLoginEmail(e.target.value)}
                    autoFocus
                  />
                  <label className="modal-label">Senha</label>
                  <input
                    className="modal-input"
                    type="password"
                    placeholder="********"
                    value={loginPassword}
                    onChange={e => setLoginPassword(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') document.getElementById('btn-entrar').click() }}
                  />
                  {loginError && <p className="modal-error">{loginError}</p>}
                </div>
                <div className="modal-actions">
                  <button className="modal-btn modal-btn-cancel" onClick={() => { setShowEmailForm(false); setLoginError('') }}>Voltar</button>
                  <button
                    id="btn-entrar"
                    className="modal-btn modal-btn-confirm"
                    disabled={!loginEmail.trim() || !loginPassword || loginLoading}
                    onClick={async () => {
                      setLoginLoading(true)
                      setLoginError('')
                      try {
                        const { signInWithEmail, createUser } = await import('../supabase')
                        let { data, error } = await signInWithEmail(loginEmail.trim(), loginPassword)
                        if (error) {
                          if (error.message?.includes('Invalid login credentials') || error.message?.includes('Email not confirmed') || error?.code === 'invalid_credentials') {
                            const { data: signUpData, error: signUpError } = await createUser(loginEmail.trim(), loginPassword, '')
                            if (signUpError) {
                              if (signUpError.message?.includes('User already registered')) {
                                throw new Error('Usuario ja existe. Verifique a senha.')
                              }
                              throw signUpError
                            }
                            if (signUpData?.session) {
                              // Ja logou automaticamente
                            } else {
                              const r = await signInWithEmail(loginEmail.trim(), loginPassword)
                              if (r.error) throw r.error
                            }
                          } else {
                            throw error
                          }
                        }
                        setShowLoginModal(false)
                        setShowEmailForm(false)
                        setLoginEmail('')
                        setLoginPassword('')
                        setLoginError('')
                      } catch (err) {
                        setLoginError(err.message || 'Erro ao entrar')
                      } finally {
                        setLoginLoading(false)
                      }
                    }}
                  >
                    {loginLoading ? 'Entrando...' : 'Entrar'}
                  </button>
                </div>
              </>
            )}
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
                          sessionStorage.setItem('loadPlaylistFromUrl', 'true')
                          const firstSongItem = list.song_ids?.[0]
                          if (firstSongItem) {
                            const parsed = parseSongIdItem(firstSongItem)
                            if (parsed) navigate(`/${parsed.songId}`)
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
              <label className="modal-label">Tipo de lista</label>
              <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '500' }}>
                  <input
                    type="radio"
                    name="listTypeCreate"
                    checked={!isSundayType}
                    onChange={() => setIsSundayType(false)}
                  />
                  Escala comum
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '500' }}>
                  <input
                    type="radio"
                    name="listTypeCreate"
                    checked={isSundayType}
                    onChange={() => setIsSundayType(true)}
                  />
                  Esse Domingo
                </label>
              </div>

              {isSundayType ? (
                <div style={{ marginBottom: '16px' }}>
                  <label className="modal-label">Selecione a filial</label>
                  <select
                    className="modal-input"
                    value={sundayLocationSelection}
                    onChange={e => setSundayLocationSelection(e.target.value)}
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color, #e0e0e0)', background: 'var(--bg-card, #fff)', color: 'var(--text-color, #333)', marginBottom: '10px' }}
                  >
                    <option value="Guarulhos">Guarulhos</option>
                    <option value="Mairinque">Mairinque</option>
                    <option value="Sorocaba">Sorocaba</option>
                  </select>
                </div>
              ) : (
                <div style={{ marginBottom: '16px' }}>
                  <label className="modal-label">Nome da lista</label>
                  <input
                    className="modal-input"
                    type="text"
                    placeholder="Digite o nome da lista"
                    value={newListName}
                    onChange={e => setNewListName(e.target.value)}
                    autoFocus
                  />
                </div>
              )}

              {selectedSongs.length > 0 && (
                <div className="reorder-container">
                  <label className="modal-label" style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Ordem das Músicas ({selectedSongs.length})</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {selectedSongs.map((item, index) => {
                      const parsed = parseSongIdItem(item)
                      if (!parsed) return null
                      const song = songs.find(s => s.id === parsed.songId)
                      if (!song) return null
                      return (
                        <div key={index} className="reorder-item">
                          <span className="reorder-item-text">
                            <span style={{ color: 'var(--accent-color, #fbb134)', marginRight: '6px' }}>{index + 1}º</span>
                            {song.name} <span style={{ opacity: 0.6, fontSize: '11px' }}>({parsed.tom})</span>
                          </span>
                          <div style={{ display: 'flex', gap: '4px' }}>
                            <button
                              type="button"
                              disabled={index === 0}
                              onClick={() => {
                                setSelectedSongs(prev => {
                                  const arr = [...prev]
                                  const temp = arr[index]
                                  arr[index] = arr[index - 1]
                                  arr[index - 1] = temp
                                  return arr
                                })
                              }}
                              className="reorder-btn"
                            >
                              ▲
                            </button>
                            <button
                              type="button"
                              disabled={index === selectedSongs.length - 1}
                              onClick={() => {
                                setSelectedSongs(prev => {
                                  const arr = [...prev]
                                  const temp = arr[index]
                                  arr[index] = arr[index + 1]
                                  arr[index + 1] = temp
                                  return arr
                                })
                              }}
                              className="reorder-btn"
                            >
                              ▼
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              <label className="modal-label">Selecione as musicas</label>
              <div style={{ position: 'relative', marginBottom: '16px' }}>
                <input
                  type="text"
                  placeholder="Pesquisar louvor..."
                  value={modalSearchQuery}
                  onChange={e => setModalSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: '10px',
                    border: '1px solid var(--border-color, rgba(0,0,0,0.1))',
                    background: 'var(--bg-card, rgba(0,0,0,0.02))',
                    color: 'var(--text-color, #333)',
                    fontSize: '15px',
                    outline: 'none',
                    transition: 'border-color 0.2s'
                  }}
                />
              </div>
              <div className="song-select-list" style={{ maxHeight: '320px', overflowY: 'auto', gap: '8px', display: 'flex', flexDirection: 'column', paddingRight: '4px' }}>
                {songs.filter(s => s.name.toLowerCase().includes(modalSearchQuery.toLowerCase())).map(song => {
                  const isSelected = selectedSongs.some(s => {
                    const parsed = parseSongIdItem(s)
                    return parsed && parsed.songId === song.id
                  })
                  return (
                    <div
                      key={song.id}
                      className="song-select-card"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 14px',
                        borderRadius: '10px',
                        background: isSelected ? 'rgba(251, 177, 52, 0.08)' : 'var(--bg-card, rgba(0,0,0,0.01))',
                        border: isSelected ? '1px solid var(--accent-color, #fbb134)' : '1px solid rgba(0,0,0,0.05)',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                      onClick={() => {
                        setSelectedSongs(prev => {
                          const exists = prev.some(s => {
                            const parsed = parseSongIdItem(s)
                            return parsed && parsed.songId === song.id
                          })
                          if (exists) {
                            return prev.filter(s => {
                              const parsed = parseSongIdItem(s)
                              return parsed && parsed.songId !== song.id
                            })
                          } else {
                            return [...prev, JSON.stringify({ songId: song.id, tom: getEffectiveSongKey(song) })]
                          }
                        })
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div
                          style={{
                            width: '18px',
                            height: '18px',
                            borderRadius: '5px',
                            border: isSelected ? 'none' : '2px solid rgba(0,0,0,0.2)',
                            background: isSelected ? 'var(--accent-color, #fbb134)' : 'transparent',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#fff',
                            fontSize: '11px',
                            fontWeight: 'bold'
                          }}
                        >
                          {isSelected && '✓'}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span className="song-select-card-name">{song.name}</span>
                          {song.composer && <span className="song-select-card-composer">{song.composer}</span>}
                        </div>
                      </div>
                      {isSelected && (
                        <div onClick={e => e.stopPropagation()}>
                          <select
                            className="tom-select"
                            value={(() => {
                              const found = selectedSongs.find(s => {
                                const parsed = parseSongIdItem(s)
                                return parsed && parsed.songId === song.id
                              })
                              const parsed = parseSongIdItem(found)
                              return (parsed && parsed.tom) || getEffectiveSongKey(song)
                            })()}
                            onChange={(e) => {
                              setSelectedSongs(prev => prev.map(s => {
                                const parsed = parseSongIdItem(s)
                                if (parsed && parsed.songId === song.id) {
                                  return JSON.stringify({ songId: song.id, tom: e.target.value })
                                }
                                return s
                              }))
                            }}
                            style={{
                              padding: '4px 8px',
                              borderRadius: '6px',
                              border: '1px solid rgba(0,0,0,0.1)',
                              fontSize: '12px',
                              fontWeight: '600',
                              outline: 'none',
                              background: 'var(--bg-card, #fff)',
                              color: 'var(--text-color, #333)'
                            }}
                          >
                            {KEYS.map(k => <option key={k} value={k}>{k}</option>)}
                          </select>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
            <div className="modal-actions">
              <button className="modal-btn modal-btn-cancel" onClick={() => setShowCreateListModal(false)}>Cancelar</button>
              <button
                className="modal-btn modal-btn-confirm"
                onClick={handleCreateList}
                disabled={!isSundayType && !newListName.trim()}
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
              <label className="modal-label">Tipo de lista</label>
              <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '500' }}>
                  <input
                    type="radio"
                    name="listTypeEdit"
                    checked={!isSundayType}
                    onChange={() => setIsSundayType(false)}
                  />
                  Escala comum
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '500' }}>
                  <input
                    type="radio"
                    name="listTypeEdit"
                    checked={isSundayType}
                    onChange={() => setIsSundayType(true)}
                  />
                  Esse Domingo
                </label>
              </div>

              {isSundayType ? (
                <div style={{ marginBottom: '16px' }}>
                  <label className="modal-label">Selecione a filial</label>
                  <select
                    className="modal-input"
                    value={sundayLocationSelection}
                    onChange={e => setSundayLocationSelection(e.target.value)}
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color, #e0e0e0)', background: 'var(--bg-card, #fff)', color: 'var(--text-color, #333)', marginBottom: '10px' }}
                  >
                    <option value="Guarulhos">Guarulhos</option>
                    <option value="Mairinque">Mairinque</option>
                    <option value="Sorocaba">Sorocaba</option>
                  </select>
                </div>
              ) : (
                <div style={{ marginBottom: '16px' }}>
                  <label className="modal-label">Nome da lista</label>
                  <input
                    className="modal-input"
                    type="text"
                    placeholder="Digite o nome da lista"
                    value={newListName}
                    onChange={e => setNewListName(e.target.value)}
                  />
                </div>
              )}

              {selectedSongs.length > 0 && (
                <div className="reorder-container">
                  <label className="modal-label" style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Ordem das Músicas ({selectedSongs.length})</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {selectedSongs.map((item, index) => {
                      const parsed = parseSongIdItem(item)
                      if (!parsed) return null
                      const song = songs.find(s => s.id === parsed.songId)
                      if (!song) return null
                      return (
                        <div key={index} className="reorder-item">
                          <span className="reorder-item-text">
                            <span style={{ color: 'var(--accent-color, #fbb134)', marginRight: '6px' }}>{index + 1}º</span>
                            {song.name} <span style={{ opacity: 0.6, fontSize: '11px' }}>({parsed.tom})</span>
                          </span>
                          <div style={{ display: 'flex', gap: '4px' }}>
                            <button
                              type="button"
                              disabled={index === 0}
                              onClick={() => {
                                setSelectedSongs(prev => {
                                  const arr = [...prev]
                                  const temp = arr[index]
                                  arr[index] = arr[index - 1]
                                  arr[index - 1] = temp
                                  return arr
                                })
                              }}
                              className="reorder-btn"
                            >
                              ▲
                            </button>
                            <button
                              type="button"
                              disabled={index === selectedSongs.length - 1}
                              onClick={() => {
                                setSelectedSongs(prev => {
                                  const arr = [...prev]
                                  const temp = arr[index]
                                  arr[index] = arr[index + 1]
                                  arr[index + 1] = temp
                                  return arr
                                })
                              }}
                              className="reorder-btn"
                            >
                              ▼
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              <label className="modal-label">Selecione as musicas</label>
              <div style={{ position: 'relative', marginBottom: '16px' }}>
                <input
                  type="text"
                  placeholder="Pesquisar louvor..."
                  value={modalSearchQuery}
                  onChange={e => setModalSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: '10px',
                    border: '1px solid var(--border-color, rgba(0,0,0,0.1))',
                    background: 'var(--bg-card, rgba(0,0,0,0.02))',
                    color: 'var(--text-color, #333)',
                    fontSize: '15px',
                    outline: 'none',
                    transition: 'border-color 0.2s'
                  }}
                />
              </div>
              <div className="song-select-list" style={{ maxHeight: '320px', overflowY: 'auto', gap: '8px', display: 'flex', flexDirection: 'column', paddingRight: '4px' }}>
                {songs.filter(s => s.name.toLowerCase().includes(modalSearchQuery.toLowerCase())).map(song => {
                  const isSelected = selectedSongs.some(s => {
                    const parsed = parseSongIdItem(s)
                    return parsed && parsed.songId === song.id
                  })
                  return (
                    <div
                      key={song.id}
                      className="song-select-card"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 14px',
                        borderRadius: '10px',
                        background: isSelected ? 'rgba(251, 177, 52, 0.08)' : 'var(--bg-card, rgba(0,0,0,0.01))',
                        border: isSelected ? '1px solid var(--accent-color, #fbb134)' : '1px solid rgba(0,0,0,0.05)',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                      onClick={() => {
                        setSelectedSongs(prev => {
                          const exists = prev.some(s => {
                            const parsed = parseSongIdItem(s)
                            return parsed && parsed.songId === song.id
                          })
                          if (exists) {
                            return prev.filter(s => {
                              const parsed = parseSongIdItem(s)
                              return parsed && parsed.songId !== song.id
                            })
                          } else {
                            return [...prev, JSON.stringify({ songId: song.id, tom: getEffectiveSongKey(song) })]
                          }
                        })
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div
                          style={{
                            width: '18px',
                            height: '18px',
                            borderRadius: '5px',
                            border: isSelected ? 'none' : '2px solid rgba(0,0,0,0.2)',
                            background: isSelected ? 'var(--accent-color, #fbb134)' : 'transparent',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#fff',
                            fontSize: '11px',
                            fontWeight: 'bold'
                          }}
                        >
                          {isSelected && '✓'}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span className="song-select-card-name">{song.name}</span>
                          {song.composer && <span className="song-select-card-composer">{song.composer}</span>}
                        </div>
                      </div>
                      {isSelected && (
                        <div onClick={e => e.stopPropagation()}>
                          <select
                            className="tom-select"
                            value={(() => {
                              const found = selectedSongs.find(s => {
                                const parsed = parseSongIdItem(s)
                                return parsed && parsed.songId === song.id
                              })
                              const parsed = parseSongIdItem(found)
                              return (parsed && parsed.tom) || getEffectiveSongKey(song)
                            })()}
                            onChange={(e) => {
                              setSelectedSongs(prev => prev.map(s => {
                                const parsed = parseSongIdItem(s)
                                if (parsed && parsed.songId === song.id) {
                                  return JSON.stringify({ songId: song.id, tom: e.target.value })
                                }
                                return s
                              }))
                            }}
                            style={{
                              padding: '4px 8px',
                              borderRadius: '6px',
                              border: '1px solid rgba(0,0,0,0.1)',
                              fontSize: '12px',
                              fontWeight: '600',
                              outline: 'none',
                              background: 'var(--bg-card, #fff)',
                              color: 'var(--text-color, #333)'
                            }}
                          >
                            {KEYS.map(k => <option key={k} value={k}>{k}</option>)}
                          </select>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
            <div className="modal-actions">
              <button className="modal-btn modal-btn-cancel" onClick={() => setShowEditListModal(false)}>Cancelar</button>
              <button
                className="modal-btn modal-btn-confirm"
                onClick={handleEditList}
                disabled={!isSundayType && !newListName.trim()}
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
                {currentPlaylist.song_ids?.map((item, index) => {
                  const parsed = parseSongIdItem(item)
                  if (!parsed) return null
                  const { songId, tom } = parsed
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
                      {tom && <span className="playlist-song-key">Tom: {tom}</span>}
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
        <div className="modal-overlay" onClick={() => { setShowDomingoModal(false); setSelectedLocation(null); setIsEditingDomingo(false); }}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
            <h2 className="modal-title">Esse Domingo {selectedLocation ? ` - ${selectedLocation}` : ''}</h2>
            <div className="modal-body">
              {loadingDomingo ? (
                <div className="loading-spinner"></div>
              ) : !selectedLocation ? (
                <div className="location-select-container" style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '10px 0' }}>
                  <p className="modal-text" style={{ textAlign: 'center', marginBottom: '8px' }}>Selecione a filial para visualizar a escala de domingo:</p>
                  <div className="location-grid" style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '360px', margin: '0 auto', width: '100%' }}>
                    {['Guarulhos', 'Mairinque', 'Sorocaba'].map(loc => (
                      <button
                        key={loc}
                        className="btn-primary"
                        style={{
                          padding: '14px 20px',
                          fontSize: '16px',
                          background: 'var(--accent-color, #fbb134)',
                          borderRadius: '12px',
                          cursor: 'pointer',
                          textAlign: 'center',
                          border: 'none',
                          color: '#fff',
                          fontWeight: '600',
                          transition: 'all 0.2s',
                          width: '100%'
                        }}
                        onClick={() => {
                          setSelectedLocation(loc)
                          setLoadingDomingo(true)
                          fetchDomingoList(loc).then(data => {
                            setDomingoList(data)
                            setLoadingDomingo(false)
                          })
                        }}
                      >
                        <span>{loc}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : userIsAdmin ? (
                <>
                  {domingoList && !isEditingDomingo ? (
                    <>
                      <p className="modal-text">Lista atual de {selectedLocation}. Clique em uma musica para tocar.</p>
                      <div className="playlist-songs">
                        {domingoList.song_ids?.map((item, index) => {
                          const parsed = parseSongIdItem(item)
                          if (!parsed) return null
                          const { songId, tom } = parsed
                          const song = songs.find(s => String(s.id) === String(songId))
                          if (!song) return null
                          return (
                            <button
                              key={song.id}
                              className="playlist-song-item"
                              onClick={() => {
                                sessionStorage.setItem('currentPlaylist', JSON.stringify(domingoList))
                                sessionStorage.setItem('currentPlaylistIndex', index.toString())
                                sessionStorage.setItem('loadPlaylistFromUrl', 'true')
                                navigate(`/${song.id}`)
                                setShowDomingoModal(false)
                              }}
                            >
                              <span className="playlist-song-number">{index + 1}</span>
                              <span className="playlist-song-name">{song.name}</span>
                              {tom && <span className="playlist-song-key">Tom: {tom}</span>}
                            </button>
                          )
                        })}
                      </div>
                    </>
                  ) : (
                    <>
                      <p className="modal-text">Selecione as musicas e o tom para o culto de domingo ({selectedLocation}):</p>
                      {selectedSongs.length > 0 && (
                        <div className="reorder-container">
                          <label className="modal-label" style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Ordem das Músicas ({selectedSongs.length})</label>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            {selectedSongs.map((item, index) => {
                              const parsed = parseSongIdItem(item)
                              if (!parsed) return null
                              const song = songs.find(s => s.id === parsed.songId)
                              if (!song) return null
                              return (
                                <div key={index} className="reorder-item">
                                  <span className="reorder-item-text">
                                    <span style={{ color: 'var(--accent-color, #fbb134)', marginRight: '6px' }}>{index + 1}º</span>
                                    {song.name} <span style={{ opacity: 0.6, fontSize: '11px' }}>({parsed.tom})</span>
                                  </span>
                                  <div style={{ display: 'flex', gap: '4px' }}>
                                    <button
                                      type="button"
                                      disabled={index === 0}
                                      onClick={() => {
                                        setSelectedSongs(prev => {
                                          const arr = [...prev]
                                          const temp = arr[index]
                                          arr[index] = arr[index - 1]
                                          arr[index - 1] = temp
                                          return arr
                                        })
                                      }}
                                      className="reorder-btn"
                                    >
                                      ▲
                                    </button>
                                    <button
                                      type="button"
                                      disabled={index === selectedSongs.length - 1}
                                      onClick={() => {
                                        setSelectedSongs(prev => {
                                          const arr = [...prev]
                                          const temp = arr[index]
                                          arr[index] = arr[index + 1]
                                          arr[index + 1] = temp
                                          return arr
                                        })
                                      }}
                                      className="reorder-btn"
                                    >
                                      ▼
                                    </button>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}

                      <div style={{ position: 'relative', marginBottom: '16px' }}>
                        <input
                          type="text"
                          placeholder="Pesquisar louvor..."
                          value={modalSearchQuery}
                          onChange={e => setModalSearchQuery(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '12px 16px',
                            borderRadius: '10px',
                            border: '1px solid var(--border-color, rgba(0,0,0,0.1))',
                            background: 'var(--bg-card, rgba(0,0,0,0.02))',
                            color: 'var(--text-color, #333)',
                            fontSize: '15px',
                            outline: 'none',
                            transition: 'border-color 0.2s'
                          }}
                        />
                      </div>
                      <div className="song-select-list" style={{ maxHeight: '320px', overflowY: 'auto', gap: '8px', display: 'flex', flexDirection: 'column', paddingRight: '4px' }}>
                        {songs.filter(s => s.name.toLowerCase().includes(modalSearchQuery.toLowerCase())).map(song => {
                          const isSelected = selectedSongs.some(s => {
                            const parsed = parseSongIdItem(s)
                            return parsed && parsed.songId === song.id
                          })
                          return (
                            <div
                              key={song.id}
                              className="song-select-card"
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '10px 14px',
                                borderRadius: '10px',
                                background: isSelected ? 'rgba(251, 177, 52, 0.08)' : 'var(--bg-card, rgba(0,0,0,0.01))',
                                border: isSelected ? '1px solid var(--accent-color, #fbb134)' : '1px solid rgba(0,0,0,0.05)',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                              }}
                              onClick={() => {
                                setSelectedSongs(prev => {
                                  const exists = prev.some(s => {
                                    const parsed = parseSongIdItem(s)
                                    return parsed && parsed.songId === song.id
                                  })
                                  if (exists) {
                                    return prev.filter(s => {
                                      const parsed = parseSongIdItem(s)
                                      return parsed && parsed.songId !== song.id
                                    })
                                  } else {
                                    return [...prev, JSON.stringify({ songId: song.id, tom: getEffectiveSongKey(song) })]
                                  }
                                })
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div
                                  style={{
                                    width: '18px',
                                    height: '18px',
                                    borderRadius: '5px',
                                    border: isSelected ? 'none' : '2px solid rgba(0,0,0,0.2)',
                                    background: isSelected ? 'var(--accent-color, #fbb134)' : 'transparent',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: '#fff',
                                    fontSize: '11px',
                                    fontWeight: 'bold'
                                  }}
                                >
                                  {isSelected && '✓'}
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                  <span className="song-select-card-name">{song.name}</span>
                                  {song.composer && <span className="song-select-card-composer">{song.composer}</span>}
                                </div>
                              </div>
                              {isSelected && (
                                <div onClick={e => e.stopPropagation()}>
                                  <select
                                    className="tom-select"
                                    value={(() => {
                                      const found = selectedSongs.find(s => {
                                        const parsed = parseSongIdItem(s)
                                        return parsed && parsed.songId === song.id
                                      })
                                      const parsed = parseSongIdItem(found)
                                      return (parsed && parsed.tom) || getEffectiveSongKey(song)
                                    })()}
                                    onChange={(e) => {
                                      setSelectedSongs(prev => prev.map(s => {
                                        const parsed = parseSongIdItem(s)
                                        if (parsed && parsed.songId === song.id) {
                                          return JSON.stringify({ songId: song.id, tom: e.target.value })
                                        }
                                        return s
                                      }))
                                    }}
                                    style={{
                                      padding: '4px 8px',
                                      borderRadius: '6px',
                                      border: '1px solid rgba(0,0,0,0.1)',
                                      fontSize: '12px',
                                      fontWeight: '600',
                                      outline: 'none',
                                      background: 'var(--bg-card, #fff)',
                                      color: 'var(--text-color, #333)'
                                    }}
                                  >
                                    {KEYS.map(k => <option key={k} value={k}>{k}</option>)}
                                  </select>
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </>
                  )}
                </>
              ) : (
                <>
                  <p className="modal-text">Musicas do culto de domingo ({selectedLocation}):</p>
                  {domingoList ? (
                    <div className="playlist-songs">
                      {domingoList.song_ids?.map((item, index) => {
                        const parsed = parseSongIdItem(item)
                        if (!parsed) return null
                        const { songId, tom } = parsed
                        const song = songs.find(s => String(s.id) === String(songId))
                        if (!song) return null
                        return (
                          <button
                            key={song.id}
                            className="playlist-song-item"
                            onClick={() => {
                              sessionStorage.setItem('currentPlaylist', JSON.stringify(domingoList))
                              sessionStorage.setItem('currentPlaylistIndex', index.toString())
                              sessionStorage.setItem('loadPlaylistFromUrl', 'true')
                              navigate(`/${song.id}`)
                              setShowDomingoModal(false)
                            }}
                          >
                            <span className="playlist-song-number">{index + 1}</span>
                            <span className="playlist-song-name">{song.name}</span>
                            {tom && <span className="playlist-song-key">Tom: {tom}</span>}
                          </button>
                        )
                      })}
                    </div>
                  ) : (
                    <p className="modal-text">Nenhuma lista agendada ainda para {selectedLocation}.</p>
                  )}
                </>
              )}
            </div>
            <div className="modal-actions" style={{ justifyContent: 'space-between' }}>
              {selectedLocation && !isEditingDomingo && (
                <button className="modal-btn modal-btn-cancel" onClick={() => { setSelectedLocation(null); setDomingoList(null); setSelectedSongs([]); }}>
                  ← Voltar Filiais
                </button>
              )}
              <div style={{ display: 'flex', gap: '8px', marginLeft: 'auto' }}>
                {isEditingDomingo ? (
                  <>
                    <button className="modal-btn modal-btn-cancel" onClick={() => setIsEditingDomingo(false)}>Voltar</button>
                    <button
                      className="modal-btn modal-btn-confirm"
                      onClick={async () => {
                        await handleSaveDomingoList()
                        setIsEditingDomingo(false)
                      }}
                      disabled={selectedSongs.length === 0}
                    >
                      Salvar alteracoes
                    </button>
                  </>
                ) : (
                  <>
                    <button className="modal-btn modal-btn-cancel" onClick={() => { setShowDomingoModal(false); setSelectedLocation(null); setIsEditingDomingo(false); }}>Fechar</button>
                    {userIsAdmin && selectedLocation && (
                      <>
                        {domingoList ? (
                          <>
                            <button
                              className="modal-btn modal-btn-confirm"
                              onClick={() => {
                                setSelectedSongs(domingoList.song_ids || [])
                                setIsEditingDomingo(true)
                              }}
                            >
                              Editar lista
                            </button>
                            <button
                              className="modal-btn modal-btn-danger"
                              onClick={async () => {
                                if (window.confirm('Tem certeza que deseja excluir a lista atual?')) {
                                  await deleteList(domingoList.id)
                                  setDomingoList(null)
                                  setSelectedSongs([])
                                }
                              }}
                            >
                              Excluir lista
                            </button>
                          </>
                        ) : (
                          <button
                            className="modal-btn modal-btn-confirm"
                            onClick={async () => {
                              const newList = await createList('Esse Domingo - ' + selectedLocation, 'domingo@cifras', selectedSongs)
                              setDomingoList(newList)
                              setSelectedSongs([])
                            }}
                            disabled={selectedSongs.length === 0}
                          >
                            Criar lista
                          </button>
                        )}
                      </>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {showUserSuggestions && (
        <div className="modal-overlay" onClick={() => setShowUserSuggestions(false)}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
            <h2 className="modal-title">Sugerir Louvor</h2>
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

      {showSuggestionsList && (
        <div className="modal-overlay" onClick={() => setShowSuggestionsList(false)}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
            <h2 className="modal-title">Sugestoes de louvores</h2>
            <div className="modal-body">
              {suggestions.length === 0 ? (
                <p className="modal-empty">Nenhuma sugestao ainda.</p>
              ) : (
                <div className="suggestions-list">
                  {suggestions.map(s => {
                    const st = statusLabel(s.status)
                    return (
                      <div key={s.id} className="suggestion-item">
                        <div className="suggestion-info">
                          <div className="suggestion-song-row">
                            <span className="suggestion-song">{s.song_name}</span>
                            <button
                              className="suggestion-play"
                              onClick={() => {
                                const id = getYoutubeId(s.youtube_url)
                                if (id) window.open(`https://www.youtube.com/watch?v=${id}`, '_blank')
                              }}
                              title="Abrir no YouTube"
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
                            </button>
                          </div>
                          <span className={`suggestion-status ${st.cls}`}>{st.text}</span>
                        </div>
                        <div className="suggestion-actions">
                          {s.status === 'approved' ? (
                            <span className="suggestion-label suggestion-label--approved">Aprovado</span>
                          ) : s.status === 'rejected' ? (
                            <span className="suggestion-label suggestion-label--rejected">Reprovado</span>
                          ) : (
                            <>
                              <button className="suggestion-status-btn suggestion-status-btn--approve" onClick={async () => { await updateSuggestionStatus(s.id, 'approved'); setSuggestions(prev => prev.map(x => x.id === s.id ? { ...x, status: 'approved' } : x)) }} title="Aprovar">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                              </button>
                              <button className="suggestion-status-btn suggestion-status-btn--reject" onClick={async () => { await updateSuggestionStatus(s.id, 'rejected'); setSuggestions(prev => prev.map(x => x.id === s.id ? { ...x, status: 'rejected' } : x)) }} title="Reprovar">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M18 6L6 18M6 6l12 12"/></svg>
                              </button>
                            </>
                          )}
                          <button
                            className="my-song-delete"
                            onClick={async () => {
                              await deleteSuggestion(s.id)
                              setSuggestions(prev => prev.filter(x => x.id !== s.id))
                            }}
                            title="Remover sugestao"
                          >
                            remover
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
            <div className="modal-actions">
              <button className="modal-btn modal-btn-cancel" onClick={() => setShowSuggestionsList(false)}>Fechar</button>
            </div>
          </div>
        </div>
      )}

      {showAddModal && (
        <div className="modal-overlay" onClick={() => { setShowAddModal(false); setImportUrl(''); setImportHtml(''); setShowImportHtml(false) }}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2 className="modal-title">Adicionar nova musica</h2>
            <div className="modal-body">
              <label className="modal-label">Nome da musica</label>
              <input
                className="modal-input"
                type="text"
                placeholder="Digite o nome da musica"
                value={newSongName}
                onChange={e => setNewSongName(e.target.value)}
                autoFocus
              />
              <label className="modal-label">Compositor</label>
              <input
                className="modal-input"
                type="text"
                placeholder="Digite o nome do compositor"
                value={newSongComposer}
                onChange={e => setNewSongComposer(e.target.value)}
              />
              <label className="modal-label">Cifra Teclado (txt)</label>
              <div className="modal-file-area" onClick={() => fileInputRef.current?.click()}>
                {newSongFile ? (
                  <span className="modal-file-name">{newSongFile.name}</span>
                ) : (
                  <span className="modal-file-placeholder">Clique para selecionar um arquivo .txt</span>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".txt"
                style={{ display: 'none' }}
                onChange={e => {
                  const file = e.target.files[0]
                  if (file && file.name.endsWith('.txt')) setNewSongFile(file)
                }}
              />
              <label className="modal-label" style={{ marginTop: '10px' }}>Cifra Violão (txt)</label>
              <div className="modal-file-area" onClick={() => fileInputGuitarRef.current?.click()}>
                {newSongFileGuitar ? (
                  <span className="modal-file-name">{newSongFileGuitar.name}</span>
                ) : (
                  <span className="modal-file-placeholder">Clique para selecionar arquivo .txt (violão)</span>
                )}
              </div>
              <input
                ref={fileInputGuitarRef}
                type="file"
                accept=".txt"
                style={{ display: 'none' }}
                onChange={e => {
                  const file = e.target.files[0]
                  if (file && file.name.endsWith('.txt')) setNewSongFileGuitar(file)
                }}
              />
              <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 13, color: '#757575' }}>ou</span>
                <button
                  className="modal-btn"
                  style={{ height: 32, fontSize: 12, padding: '0 12px', background: '#f5f5f5', border: '1px solid #e0e0e0', borderRadius: 6, cursor: 'pointer' }}
                  onClick={() => setImportUrl(importUrl ? '' : ' ')}
                >
                  Importar do CifraClub
                </button>
              </div>
              {importUrl !== '' && (
                <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label className="modal-label" style={{ marginTop: 0 }}>Link da cifra</label>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <input
                      className="modal-input"
                      type="url"
                      placeholder="https://www.cifraclub.com.br/artista/musica/"
                      value={importUrl}
                      onChange={e => setImportUrl(e.target.value)}
                      style={{ marginBottom: 0, flex: 1 }}
                    />
                    <button
                      className="modal-btn modal-btn-confirm"
                      onClick={handleImportFromUrl}
                      disabled={importLoading || !importUrl.trim()}
                      style={{ height: 40, whiteSpace: 'nowrap', fontSize: 13 }}
                    >
                      {importLoading ? 'Importando...' : 'Importar'}
                    </button>
                  </div>
                </div>
              )}
              {showImportHtml && (
                <div style={{ marginTop: 8 }}>
                  <label className="modal-label">OU cole o codigo fonte da pagina do CifraClub</label>
                  <textarea
                    className="modal-input"
                    style={{ height: 120, resize: 'vertical', padding: 8, fontFamily: 'monospace', fontSize: 12, marginBottom: 6 }}
                    placeholder="Clique com botao direito na pagina > 'Ver codigo fonte da pagina' (Ctrl+U), copie tudo e cole aqui."
                    value={importHtml}
                    onChange={e => setImportHtml(e.target.value)}
                  />
                  <button
                    className="modal-btn modal-btn-confirm"
                    onClick={handleImportFromHtml}
                    disabled={!importHtml.trim()}
                    style={{ height: 32, fontSize: 12 }}
                  >
                    Processar HTML
                  </button>
                </div>
              )}
              <label className="modal-label" style={{ marginTop: 16 }}>Link do YouTube (opcional)</label>
              <input
                className="modal-input"
                type="url"
                placeholder="https://youtube.com/watch?v=..."
                value={newSongYoutubeUrl}
                onChange={e => setNewSongYoutubeUrl(e.target.value)}
              />
            </div>
            <div className="modal-actions">
              <button className="modal-btn modal-btn-cancel" onClick={() => { setShowAddModal(false); setImportUrl(''); setImportHtml(''); setShowImportHtml(false) }}>Cancelar</button>
              <button
                className="modal-btn modal-btn-confirm"
                onClick={handleAddSong}
                disabled={!newSongName.trim() || !newSongFile}
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}

      <Navbar
        user={user}
        userIsAdmin={userIsAdmin}
        setShowDomingoModal={setShowDomingoModal}
        setShowUserSuggestions={setShowUserSuggestions}
        showUserSuggestions={showUserSuggestions}
        userSuggestions={userSuggestions}
        setUserSuggestions={setUserSuggestions}
        setShowSuggestionsList={setShowSuggestionsList}
        showSuggestionsList={showSuggestionsList}
        suggestions={suggestions}
        setSuggestions={setSuggestions}
        showUserMenu={showUserMenu}
        setShowUserMenu={setShowUserMenu}
        avatarUrl={avatarUrl}
        displayName={displayName}
        avatarLetter={avatarLetter}
        setShowLoginModal={setShowLoginModal}
        setShowMySongs={setShowMySongs}
        setSongFilter={setSongFilter}
        showListsModal={showListsModal}
        setShowListsModal={setShowListsModal}
        userLists={userLists}
        setUserLists={setUserLists}
        showAddModal={showAddModal}
        setShowAddModal={setShowAddModal}
        isMobileNav={true}
        fetchSuggestions={fetchSuggestions}
        fetchUserSuggestions={fetchUserSuggestions}
      />
    </div>
  )
}
