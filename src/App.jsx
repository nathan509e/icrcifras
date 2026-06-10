import { useState, useRef, useEffect, useCallback } from 'react'
import { fetchSongs, saveSong, deleteSong, signInWithGoogle, signOut, onAuthChange, getCurrentUser } from './supabase'
import './App.css'

const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
const FLAT_TO_SHARP = { 'Db': 'C#', 'Eb': 'D#', 'Gb': 'F#', 'Ab': 'G#', 'Bb': 'A#', 'Cb': 'B' }
const TUNINGS = {
  'standard': 'E A D G B e',
  'drop-d': 'D A D G B e',
  'open-g': 'D G D G B d',
  'open-d': 'D A D F# A d',
  'half-step-down': 'Eb Ab Db Gb Bb eb',
  'full-step-down': 'D G C F A d',
}

function normalizeNote(note) {
  if (note.length === 1) return note.toUpperCase()
  const first = note[0].toUpperCase()
  const second = note[1]
  if (second === 'b') return FLAT_TO_SHARP[first + second] || (first + second)
  if (second === '#') return first + second
  return first
}

function transposeNote(note, offset) {
  const normalized = normalizeNote(note)
  const idx = NOTES.indexOf(normalized)
  if (idx === -1) return note
  return NOTES[(idx + offset + 1200) % 12]
}

function transposeChordString(chordStr, offset) {
  if (offset === 0) return chordStr
  let result = chordStr.replace(/^([A-Ga-g][#b]?)/, (_, root) => transposeNote(root, offset))
  result = result.replace(/\/([A-Ga-g][#b]?)/g, (_, bass) => '/' + transposeNote(bass, offset))
  return result
}

function simplifyChordString(chordStr) {
  return chordStr.replace(/^([A-Ga-g][#b]?)(m?)(.*)$/, '$1$2')
}

function processChordHtml(html, transposeOffset, simplify) {
  if (transposeOffset === 0 && !simplify) return html
  return html.replace(/<b>([^<]+)<\/b>/g, (_, chordText) => {
    let c = chordText.trim()
    if (transposeOffset !== 0) c = transposeChordString(c, transposeOffset)
    if (simplify) c = simplifyChordString(c)
    return `<b>${c}</b>`
  })
}

function getKeyFromOffset(originalKey, offset) {
  return transposeNote(originalKey, offset)
}

function convertPlainTextToHtml(text) {
  const chordPattern = /^[A-G][#b]?(?:m|M|dim|aug|sus|add|°|7M)?[0-9]*(?:\([^)]*\))?(?:\/[A-G][#b]?(?:m|M|dim|aug|sus|add|°|7M)?[0-9]*)?$/
  const sectionPattern = /^\[.*\]$/
  return text.split('\n').map(line => {
    const trimmed = line.trim()
    if (!trimmed) return line
    const tokens = trimmed.split(/\s+/)
    const isChordLine = tokens.every(t => chordPattern.test(t) || sectionPattern.test(t))
    if (!isChordLine) return line
    return line.replace(/\b([A-G][#b]?(?:m|M|dim|aug|sus|add|°|7M)?[0-9]*(?:\([^)]*\))?(?:\/[A-G][#b]?(?:m|M|dim|aug|sus|add|°|7M)?[0-9]*)?)(?=\s|$)/g, '<b>$1</b>')
  }).join('\n')
}

function getYoutubeId(url) {
  if (!url) return ''
  const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/)
  return match ? match[1] : ''
}

const ORIGINAL_KEY = 'G'

const RAW_CHORD_HTML = `[Intro]\n<b>C7M</b>  <b>G/B</b>  <b>Am7</b>  <b>A7(2)</b>  <b>Am7</b>\n\n[Primeira Parte]\n\n<b>G</b>\nQuem foi muito perdoado\n<b>G9</b>                      <b>Em7</b>\nDeveria saber o valor de ser amado\n\nMas por outro lado\n\nO bem que eu quero fazer\n                <b>Am7</b>\nDe fato eu nao faco\n                    <b>G/B</b>\nE, dependendo do pecado\n                       <b>C</b>\nEu nem me sinto incomodado\n                        <b>Cm/Eb</b>\nEntao esbarro na Tua palavra\n\nE sou confrontado\n\n[Pre-Refrao]\n\n<b>C9</b>                  <b>D</b>                 <b>Em7</b>\n   Nao adianta fingir que esta tudo bem\n                        <b>Bm</b>\nSe de Ti eu recebi perdao\n\nMas nao consigo perdoar ninguem\n\n<b>C9</b>                      <b>D</b>\n   A outra face eu nao dei\n                  <b>Em7</b>\nSo o meu ego escutei\n                   <b>Bm</b>\nAte amei os meus amigos\n             <b>Bm7</b>\nMas meus inimigos odiei\n\n    <b>C</b>\nNa minha hipocrisia\n      <b>D</b>\nMe achei melhor que o outro\n     <b>Bm7</b>\nSem perceber a trave\n       <b>Em7</b>\nQue estava no meu olho\n\n    <b>C</b>\nEm pele de ovelha\n  <b>D</b>\nAgindo como um lobo\n   <b>Bm7</b>\nMe esqueci do reino\n    <b>Em7</b>\nJuntando os meus tesouros\n\n[Refrao 1]\n\n<b>C7M</b>\nAh, Jesus\n\nQuebra o meu orgulho\n            <b>Bm7</b>\nE faz-me olhar pra cruz\n                      <b>Am7</b>\nTira a dureza do meu coracao\n\n                          <b>C7M</b>\nDe joelhos, eu imploro o Teu perdao\n\nPois Tua graca\n              <b>Bm7</b>\nJoga a minha carne ao chao\n                        <b>Am7</b>\nE me ensina o valor da comunhao\n                     <b>G/B</b>   <b>C7M</b>\nDo beber do vinho e partilhar do pao\n\n[Solo 1] <b>C7M</b>  <b>G/B</b>  <b>Am7</b>\n\n[Segunda Parte]\n\n<b>C7M</b>               <b>Bm</b>\nEu sou o vaso, Tu es o oleiro\n  <b>Am7</b>                  <b>G/B</b>\nQuebra minha vida, me refaz por inteiro\n <b>C7M</b>                 <b>Bm</b>\nTomo a minha cruz e nego a mim mesmo\n <b>Am7</b>                    <b>G/B</b>\nPois do pecado nao sou mais prisioneiro\n\n<b>C7M</b>               <b>Bm</b>\nEu sou o vaso, Tu es o oleiro\n  <b>Am7</b>                  <b>G/B</b>\nQuebra minha vida, me refaz por inteiro\n <b>C7M</b>                 <b>Bm</b>\nTomo a minha cruz e nego a mim mesmo\n <b>Am7</b>                    <b>G/B</b>\nPois do pecado nao sou mais prisioneiro\n\n[Pre-Refrao 2]\n\n <b>C7M</b>                   <b>G/B</b>\nMesmo com falhas, esse e o meu desejo\n <b>Am7</b>      <b>G/B</b>  <b>C</b>     <b>D</b>      <b>G</b>\nDa-me um coracao igual ao Teu\n\n[Refrao 2]\n\n <b>G</b>                  <b>G/B</b>    <b>C</b>\nDa-me um coracao igual ao Teu\n     <b>D</b>\nMeu Mestre\n <b>G</b>                  <b>G/B</b>    <b>C</b>\nDa-me um coracao igual ao Teu\n     <b>D</b>               <b>G/B</b>  <b>Em7</b>\nCoracao disposto a obedecer\n     <b>G/B</b>               <b>Em7</b>\nCumprir todo o Teu querer\n <b>Am7</b>      <b>G/B</b>  <b>C</b>     <b>D</b>      <b>G</b>\nDa-me um coracao igual ao Teu\n\n                   <b>G/B</b>   <b>C</b>\nDa-me um coracao igual ao Teu\n     <b>D</b>\nMeu Mestre\n <b>G</b>                  <b>G/B</b>    <b>C</b>\nDa-me um coracao igual ao Teu\n     <b>D</b>               <b>G/B</b>  <b>Em7</b>\nCoracao disposto a obedecer\n     <b>G/B</b>               <b>Em7</b>\nCumprir todo o Teu querer\n <b>Am7</b>      <b>G/B</b>  <b>C</b>     <b>D</b>      <b>C7M</b>\nDa-me um coracao igual ao Teu\n\n[Refrao 1]\n\nJesus\n\nQuebra o meu orgulho\n            <b>G/B</b>\nE faz-me olhar pra cruz\n                      <b>Am7</b>\nTira a dureza do meu coracao\n\n                          <b>C7M</b>\nDe joelhos, eu imploro o Teu perdao\n\nPois Tua graca\n              <b>G/B</b>\nJoga a minha carne ao chao\n                        <b>Am7</b>\nE me ensina o valor da comunhao\n                            <b>C7M</b>\nDo beber do vinho e partilhar do pao\n\n[Ponte]\n\n       <b>C7M</b>\nJudas veio ao Teu encontro\n        <b>G/B</b>\nCom a traicao pesando\n        <b>Am7</b>\nMas Te vejo se inclinando\n              <b>G/B</b>\nE os pes do traidor lavando\n\n      <b>C7M</b>\nVejo Pedro Te negando\n     <b>G/B</b>\nE o galo entao cantando\n         <b>Am7</b>\nMesmo assim, Tu dizes:\n           <b>G/B</b>\nPedro, apascenta o meu rebanho\n\n[Pre-Refrao 3]\n\n        <b>C7M</b>\nQuebrantado, estou chorando\n      <b>G/B</b>\nMinha alma esta clamando\n<b>Am7</b>      <b>G/B</b>  <b>C</b>     <b>D</b>      <b>G</b>\nDa-me um coracao igual ao Teu\n\n[Refrao 2]\n\n <b>G</b>                  <b>G/B</b>    <b>C</b>\nDa-me um coracao igual ao Teu\n     <b>D</b>\nMeu Mestre\n <b>G</b>                  <b>G/B</b>    <b>C</b>\nDa-me um coracao igual ao Teu\n     <b>D</b>               <b>G/B</b>  <b>Em7</b>\nCoracao disposto a obedecer\n     <b>G/B</b>               <b>Em7</b>\nCumprir todo o Teu querer\n <b>Am7</b>      <b>G/B</b>  <b>C</b>     <b>D</b>      <b>G</b>\nDa-me um coracao igual ao Teu\n\n[Refrao Final]\n\nJesus\n\nQuebra o meu orgulho\n            <b>G/B</b>\nE faz-me olhar pra cruz\n                      <b>Am7</b>\nTira a dureza do meu coracao\n                  <b>G/B</b>  <b>C7M</b>\nDe joelhos, eu imploro o Teu perdao\n\nPois Tua graca\n              <b>G/B</b>\nJoga a minha carne ao chao\n                        <b>Am7</b>\nE me ensina o valor da comunhao\n                            <b>G/B</b>\nDo beber do vinho e partilhar do pao\n\n[Final] <b>C7M</b>  <b>G/B</b>  <b>Em7</b>  <b>C7M</b>`

function App() {
  const [autoScrollSpeed, setAutoScrollSpeed] = useState(5)
  const [isScrolling, setIsScrolling] = useState(false)
  const [fontSize, setFontSize] = useState(14)
  const [transposeOffset, setTransposeOffset] = useState(0)
  const [simplifyChords, setSimplifyChords] = useState(false)
  const [capo, setCapo] = useState(0)
  const [tuning, setTuning] = useState('standard')
  const [metronomeBpm, setMetronomeBpm] = useState(100)
  const [isMetronomePlaying, setIsMetronomePlaying] = useState(false)
  const [selectedChord, setSelectedChord] = useState('')

  const [songs, setSongs] = useState([])
  const [showAddModal, setShowAddModal] = useState(false)
  const [newSongName, setNewSongName] = useState('')
  const [newSongFile, setNewSongFile] = useState(null)
  const [newSongYoutubeUrl, setNewSongYoutubeUrl] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [showSearchResults, setShowSearchResults] = useState(false)
  const [selectedSongId, setSelectedSongId] = useState(null)
  const [showMySongs, setShowMySongs] = useState(false)
  const [user, setUser] = useState(null)
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)

  const scrollRef = useRef(null)
  const metronomeRef = useRef(null)
  const audioCtxRef = useRef(null)
  const searchRef = useRef(null)
  const fileInputRef = useRef(null)
  const userMenuRef = useRef(null)

  useEffect(() => {
    fetchSongs().then(data => {
      if (data && data.length > 0) setSongs(data)
    })
  }, [])

  useEffect(() => {
    getCurrentUser().then(setUser)
    const unsubscribe = onAuthChange(setUser)
    return unsubscribe
  }, [])

  const searchResults = searchQuery.trim()
    ? songs.filter(s =>
        s.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : []

  const loadSongContent = useCallback((id) => {
    setSelectedSongId(id)
    setShowSearchResults(false)
    setSearchQuery('')
    setTransposeOffset(0)
    setSimplifyChords(false)
    setCapo(0)
    setIsScrolling(false)
  }, [])

  useEffect(() => {
    function handleClickOutside(e) {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowSearchResults(false)
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setShowUserMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (!isScrolling) {
      clearInterval(scrollRef.current)
      return
    }
    const speed = autoScrollSpeed * 0.6
    scrollRef.current = setInterval(() => {
      window.scrollBy(0, speed)
    }, 50)
    return () => clearInterval(scrollRef.current)
  }, [isScrolling, autoScrollSpeed])

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.code === 'Space' && isScrolling) {
        e.preventDefault()
        setIsScrolling(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isScrolling])

  useEffect(() => {
    if (!isMetronomePlaying) {
      clearInterval(metronomeRef.current)
      return
    }

    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)()
    }
    const ctx = audioCtxRef.current
    if (ctx.state === 'suspended') ctx.resume()

    let beat = 0
    const intervalMs = 60000 / metronomeBpm

    metronomeRef.current = setInterval(() => {
      const now = ctx.currentTime
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.frequency.value = beat % 4 === 0 ? 1100 : 880
      gain.gain.setValueAtTime(0.5, now)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05)
      osc.start(now)
      osc.stop(now + 0.05)
      beat++
    }, intervalMs)

    return () => {
      clearInterval(metronomeRef.current)
    }
  }, [isMetronomePlaying, metronomeBpm])

  const handleAddSong = async () => {
    if (!newSongName.trim() || !newSongFile) return
    const content = await newSongFile.text()
    const saved = await saveSong(newSongName.trim(), content, newSongYoutubeUrl.trim())
    if (saved) {
      setSongs(prev => [saved, ...prev])
      setShowAddModal(false)
      setNewSongName('')
      setNewSongFile(null)
      setNewSongYoutubeUrl('')
    }
  }

  const handleDeleteSong = async (id) => {
    const ok = await deleteSong(id)
    if (ok) {
      setSongs(prev => prev.filter(s => s.id !== id))
      if (selectedSongId === id) setSelectedSongId(null)
    }
  }

  const currentSong = selectedSongId
    ? songs.find(s => s.id === selectedSongId)
    : null

  const currentRawHtml = currentSong
    ? (currentSong.content.includes('<b>') ? currentSong.content : convertPlainTextToHtml(currentSong.content))
    : RAW_CHORD_HTML
  const processedChordHtml = processChordHtml(currentRawHtml, transposeOffset, simplifyChords)
  const currentKey = getKeyFromOffset(ORIGINAL_KEY, transposeOffset)

  const handleChordClick = (e) => {
    if (e.target.tagName === 'B') {
      setSelectedChord(e.target.textContent)
    }
  }

  return (
    <div className="page-wrapper">
      <header className="header">
        <div className="container header-inner">
          <h1 className="header-logo"><a href="/">Cifra Club</a></h1>
          <div className="search-wrapper" ref={searchRef}>
            <form className="search-form" action="/" onSubmit={e => e.preventDefault()}>
              <label htmlFor="search" className="hidden-text">O que voce quer tocar hoje?</label>
              <input
                id="search"
                className="search-input"
                placeholder="O que voce quer tocar hoje?"
                autoComplete="off"
                value={searchQuery}
                onChange={e => {
                  setSearchQuery(e.target.value)
                  setShowSearchResults(true)
                }}
                onFocus={() => setShowSearchResults(true)}
              />
              <button type="submit" className="search-btn" aria-label="Buscar"><span className="hidden-text">Buscar</span></button>
            </form>
            {showSearchResults && searchResults.length > 0 && (
              <div className="search-results">
                {searchResults.map(song => (
                  <button
                    key={song.id}
                    className="search-result-item"
                    onClick={() => loadSongContent(song.id)}
                  >
                    <span className="search-result-name">{song.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <nav className="nav-links">
            <button className="nav-assine" onClick={() => setShowAddModal(true)}>Adicionar</button>
            <button className="nav-link" onClick={() => setShowMySongs(true)}>Minhas musicas</button>
            <a href="#" className="nav-link">Listas</a>
            <a href="#" className="nav-link">Aprenda</a>
            <a href="#" className="nav-link">Mais</a>
            {user ? (
              <div className="nav-user" ref={userMenuRef}>
                <button className="nav-user-trigger" onClick={() => setShowUserMenu(v => !v)}>
                  {user.user_metadata?.avatar_url && (
                    <img src={user.user_metadata.avatar_url} alt="" className="nav-avatar" />
                  )}
                  <span className="nav-username">{user.user_metadata?.full_name || user.email}</span>
                  <span className="nav-user-arrow">&#9662;</span>
                </button>
                {showUserMenu && (
                  <div className="nav-user-card">
                    <div className="nav-user-card-header">
                      {user.user_metadata?.avatar_url && (
                        <img src={user.user_metadata.avatar_url} alt="" className="nav-user-card-avatar" />
                      )}
                      <div className="nav-user-card-info">
                        <span className="nav-user-card-name">{user.user_metadata?.full_name || 'Usuario'}</span>
                        <span className="nav-user-card-email">{user.email}</span>
                      </div>
                    </div>
                    <div className="nav-user-card-divider" />
                    <button className="nav-user-card-item" onClick={() => { setShowMySongs(true); setShowUserMenu(false) }}>
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
        </div>
      </header>

      <main>
        <div className="container breadcrumb">
          <ol>
            <li><a href="/">Pagina Inicial</a><span className="sep">&#9658;</span></li>
            {currentSong ? (
              <li>{currentSong.name}</li>
            ) : (
              <>
                <li><a href="/estilos/gospelreligioso/">Gospel/Religioso</a><span className="sep">&#9658;</span></li>
                <li><a href="/julliany-souza/">Julliany Souza</a><span className="sep">&#9658;</span></li>
                <li>Ah, Jesus / Coracao Igual Ao Teu</li>
              </>
            )}
          </ol>
        </div>

        <div className="container cifra-page">
          <div className="cifra-header">
            <h1 className="cifra-title">{currentSong ? currentSong.name : 'Ah, Jesus / Coracao Igual Ao Teu'}</h1>
            <h2 className="cifra-artist">{currentSong ? '' : <a href="/julliany-souza/">Julliany Souza</a>}</h2>
            <div className="cifra-meta">
              <span className="version-badge">
                <span className="check"></span>
                Cifra: Principal <span id="js-c-mode">(violao e guitarra)</span>
                <span className="arrow"></span>
              </span>
              <button className="btn-fav">Favoritar Cifra</button>
            </div>
          </div>

          <div className="cifra-body">
            <aside className="instrument-sidebar">
              <div className="sidebar-section">
                <h3 className="sidebar-title">Tom</h3>
                <div className="tool-row">
                  <button className="tool-btn" onClick={() => setTransposeOffset(t => Math.max(-6, t - 1))} title="Diminuir tom">−</button>
                  <span className="tool-value">{currentKey}</span>
                  <button className="tool-btn" onClick={() => setTransposeOffset(t => Math.min(6, t + 1))} title="Aumentar tom">+</button>
                </div>
                <div className="tool-hint">
                  {transposeOffset !== 0 && <span>({transposeOffset > 0 ? '+' : ''}{transposeOffset} semitons)</span>}
                </div>
              </div>

              <div className="sidebar-section">
                <h3 className="sidebar-title">Simplificar</h3>
                <label className="toggle-switch">
                  <input type="checkbox" checked={simplifyChords} onChange={(e) => setSimplifyChords(e.target.checked)} />
                  <span className="toggle-track"></span>
                </label>
                <span className="tool-hint">{simplifyChords ? 'Ativado' : 'Desativado'}</span>
              </div>

              <div className="sidebar-section">
                <h3 className="sidebar-title">Capotraste</h3>
                <div className="tool-row">
                  <button className="tool-btn" onClick={() => setCapo(c => Math.max(0, c - 1))} title="Diminuir casa">−</button>
                  <span className="tool-value">{capo}ª</span>
                  <button className="tool-btn" onClick={() => setCapo(c => Math.min(12, c + 1))} title="Aumentar casa">+</button>
                </div>
                <div className="tool-hint">
                  {capo > 0 && <span>Tom real: {getKeyFromOffset(ORIGINAL_KEY, transposeOffset - capo)}</span>}
                </div>
              </div>

              <div className="sidebar-section">
                <h3 className="sidebar-title">Afinação</h3>
                <select className="tool-select" value={tuning} onChange={(e) => setTuning(e.target.value)}>
                  {Object.entries(TUNINGS).map(([key, label]) => (
                    <option key={key} value={key}>{key.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())} ({label})</option>
                  ))}
                </select>
              </div>

              <div className="sidebar-section">
                <h3 className="sidebar-title">Auto Rolagem</h3>
                <div className="tool-row">
                  <button
                    className={`tool-btn play-btn ${isScrolling ? 'active' : ''}`}
                    onClick={() => setIsScrolling(s => !s)}
                  >
                    {isScrolling ? '⏸' : '▶'}
                  </button>
                  <span className="tool-label">{isScrolling ? 'Pausar' : 'Iniciar'}</span>
                </div>
                <div className="tool-slider-row">
                  <span className="slider-label">Velocidade</span>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={autoScrollSpeed}
                    onChange={(e) => setAutoScrollSpeed(Number(e.target.value))}
                    className="tool-slider"
                  />
                  <span className="slider-value">{autoScrollSpeed}</span>
                </div>
                {isScrolling && <span className="tool-hint">Espaço para pausar</span>}
              </div>

              <div className="sidebar-section">
                <h3 className="sidebar-title">Metrônomo</h3>
                <div className="tool-row">
                  <button
                    className={`tool-btn play-btn ${isMetronomePlaying ? 'active' : ''}`}
                    onClick={() => setIsMetronomePlaying(s => !s)}
                  >
                    {isMetronomePlaying ? '⏹' : '▶'}
                  </button>
                  <span className="tool-label">{isMetronomePlaying ? 'Parar' : 'Iniciar'}</span>
                </div>
                <div className="tool-slider-row">
                  <span className="slider-label">BPM</span>
                  <input
                    type="range"
                    min="40"
                    max="240"
                    value={metronomeBpm}
                    onChange={(e) => setMetronomeBpm(Number(e.target.value))}
                    className="tool-slider"
                  />
                  <span className="slider-value">{metronomeBpm}</span>
                </div>
              </div>

              <div className="sidebar-section">
                <h3 className="sidebar-title">Fonte</h3>
                <div className="tool-slider-row">
                  <span className="slider-label">{fontSize}px</span>
                  <input
                    type="range"
                    min="12"
                    max="24"
                    value={fontSize}
                    onChange={(e) => setFontSize(Number(e.target.value))}
                    className="tool-slider"
                  />
                </div>
              </div>

              {selectedChord && (
                <div className="sidebar-section chord-dictionary">
                  <h3 className="sidebar-title">Acorde</h3>
                  <div className="chord-display">
                    <span className="chord-name">{selectedChord}</span>
                  </div>
                </div>
              )}
            </aside>

            <div className="cifra-col-left">
              <div className="cifra-content" style={{ fontSize: `${fontSize}px` }}>
                <div className="cifra-tom">
                  tom: <a href="#" title="alterar o tom da cifra">{currentKey}</a>
                </div>
                <pre onClick={handleChordClick} dangerouslySetInnerHTML={{
                  __html: processedChordHtml
                }} />
              </div>

              <div className="cifra-footer">
                <p>
                  Composicao de Ana Paula Valadao / Leo Brandao / Lucas Wallas / Roger Lima.
                  <a href="#"> Esta informacao esta errada? Nos avise.</a>
                </p>
                <div className="cifra-credits">
                  <b>Colaboracao e revisao: </b>
                  <div className="avatar-list">
                    <a href="#"><img src="https://akamai.sscdn.co/tb/ccid-avatar/0/3/4nzkevufwes_50.jpg" alt="Rafael Reis" /></a>
                    <a href="#"><img src="https://akamai.sscdn.co/tb/ccid-avatar/0/7/4rus3mjc6hr_50.jpg" alt="Jose Chaves" /></a>
                  </div>
                </div>
              </div>
            </div>

            <div className="cifra-col-right">
              <section className="player-section">
                <div className="player-video">
                  <div className="player-embed">
                    {(() => {
                      const videoId = currentSong ? getYoutubeId(currentSong.youtube_url) : 'ldK43s9UyQI'
                      return videoId ? (
                        <iframe
                          src={`https://www.youtube.com/embed/${videoId}`}
                          title="YouTube video player"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 'none' }}
                        />
                      ) : (
                        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999', font: '14px Roboto, sans-serif' }}>
                          Nenhum video disponivel
                        </div>
                      )
                    })()}
                  </div>
                </div>
              </section>

            </div>
          </div>
        </div>
      </main>

      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
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
              <label className="modal-label">Arquivo TXT</label>
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
              <button className="modal-btn modal-btn-cancel" onClick={() => setShowAddModal(false)}>Cancelar</button>
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

      {showLoginModal && (
        <div className="modal-overlay" onClick={() => setShowLoginModal(false)}>
          <div className="modal modal-login" onClick={e => e.stopPropagation()}>
            <h2 className="modal-title">Entrar</h2>
            <p className="modal-login-desc">Entre com sua conta Google para salvar e gerenciar suas musicas.</p>
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

      {showMySongs && (
        <div className="modal-overlay" onClick={() => setShowMySongs(false)}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
            <h2 className="modal-title">Minhas musicas</h2>
            <div className="modal-body">
              {songs.length === 0 ? (
                <p className="modal-empty">Nenhuma musica adicionada ainda.</p>
              ) : (
                <div className="my-songs-list">
                  {songs.map(song => (
                    <div key={song.id} className="my-song-item">
                      <button
                        className="my-song-name"
                        onClick={() => {
                          loadSongContent(song.id)
                          setShowMySongs(false)
                        }}
                      >
                        {song.name}
                      </button>
                      <button
                        className="my-song-delete"
                        onClick={() => handleDeleteSong(song.id)}
                        title="Remover musica"
                      >
                        Remover
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
    </div>
  )
}

export default App
