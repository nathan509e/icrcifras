import { useState, useRef, useEffect, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { fetchSongs, saveSong, deleteSong, signInWithGoogle, signOut, fetchSuggestions, saveSuggestion, deleteSuggestion, updateSuggestionStatus, fetchUserSuggestions, fetchUserLists, createList, updateList, deleteList, fetchDomingoList } from './supabase'
import { useAuth } from './AuthContext'
import Navbar from './components/Navbar'
import './App.css'

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
  if (!note) return ''
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

function chordToThird(chordStr) {
  const root = chordStr.match(/^([A-Ga-g][#b]?)/)
  if (!root) return chordStr
  const base = normalizeNote(root[1])
  const rest = chordStr.slice(root[1].length)
  const isMinor = rest.startsWith('m') || rest.startsWith('dim') || rest.startsWith('°')
  const offset = isMinor ? 3 : 4
  return transposeNote(base, offset)
}

function processChordHtml(html, transposeOffset, simplify, violin) {
  if (transposeOffset === 0 && !simplify && !violin) return html
  return html.replace(/<b>([^<]+)<\/b>/g, (_, chordText) => {
    let c = chordText.trim()
    if (transposeOffset !== 0) c = transposeChordString(c, transposeOffset)
    if (violin) c = chordToThird(c)
    else if (simplify) c = simplifyChordString(c)
    return `<b>${c}</b>`
  })
}

function getKeyFromOffset(originalKey, offset, forceMinor) {
  if (!originalKey) return originalKey || ''
  const isMinor = forceMinor !== undefined ? forceMinor : originalKey.endsWith('m')
  const root = isMinor && originalKey.endsWith('m') ? originalKey.slice(0, -1) : originalKey
  const transposed = transposeNote(root, offset)
  return isMinor ? transposed + 'm' : transposed
}

function getTransposeOffsetFromNotes(originalNote, targetNote) {
  if (!originalNote || !targetNote) return 0
  const normalized1 = normalizeNote(originalNote)
  const normalized2 = normalizeNote(targetNote)
  const idx1 = NOTES.indexOf(normalized1)
  const idx2 = NOTES.indexOf(normalized2)
  if (idx1 === -1 || idx2 === -1) return 0
  return (idx2 - idx1 + 12) % 12
}

function getFormaTomTransposed(originalFormaTom, offset) {
  if (!originalFormaTom) return null
  return getKeyFromOffset(originalFormaTom, offset)
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

function statusLabel(s) {
  if (s === 'approved') return { text: 'Aprovado', cls: 'status-approved' }
  if (s === 'rejected') return { text: 'Reprovado', cls: 'status-rejected' }
  return { text: 'Em analise', cls: 'status-pending' }
}

function stripTomLine(text) {
  return text.replace(/^[Tt]om\s*:\s*[A-G][#b]?m?(?:\s*\([^)]*\))?\s*\n?/m, '')
}

function extractTomInfo(text) {
  const match = text.match(/^[Tt]om\s*:\s*([A-G][#b]?m?)(?:\s*\(forma dos acordes no tom de\s+([A-G][#b]?m?)\))?\s*\n?/m)
  if (match) {
    return {
      tom: match[1],
      formaTom: match[2] || null
    }
  }
  return { tom: null, formaTom: null }
}

function detectKey(textContent) {
  const tomMatch = textContent.match(/^[Tt]om\s*:\s*([A-G][#b]?m?)/m)
  if (tomMatch) return tomMatch[1]
  const chordRoots = textContent.match(/\b([A-G][#b]?)(?=\s*[\/\(\)\d]|m(?!\w)|M|dim|aug|sus|add|°|7|$)/g)
  if (!chordRoots || chordRoots.length === 0) return 'G'
  const counts = {}
  const seen = []
  for (const r of chordRoots) {
    if (!counts[r]) { counts[r] = 0; seen.push(r) }
    counts[r]++
  }
  let best = seen[0], bestCount = counts[best]
  for (const r of seen) {
    if (counts[r] > bestCount) { best = r; bestCount = counts[r] }
  }
  return best
}

const ORIGINAL_KEY = 'G'

const RAW_CHORD_HTML = `[Intro]\n<b>C7M</b>  <b>G/B</b>  <b>Am7</b>  <b>A7(2)</b>  <b>Am7</b>\n\n[Primeira Parte]\n\n<b>G</b>\nQuem foi muito perdoado\n<b>G9</b>                      <b>Em7</b>\nDeveria saber o valor de ser amado\n\nMas por outro lado\n\nO bem que eu quero fazer\n                <b>Am7</b>\nDe fato eu nao faco\n                    <b>G/B</b>\nE, dependendo do pecado\n                       <b>C</b>\nEu nem me sinto incomodado\n                        <b>Cm/Eb</b>\nEntao esbarro na Tua palavra\n\nE sou confrontado\n\n[Pre-Refrao]\n\n<b>C9</b>                  <b>D</b>                 <b>Em7</b>\n   Nao adianta fingir que esta tudo bem\n                        <b>Bm</b>\nSe de Ti eu recebi perdao\n\nMas nao consigo perdoar ninguem\n\n<b>C9</b>                      <b>D</b>\n   A outra face eu nao dei\n                  <b>Em7</b>\nSo o meu ego escutei\n                   <b>Bm</b>\nAte amei os meus amigos\n             <b>Bm7</b>\nMas meus inimigos odiei\n\n    <b>C</b>\nNa minha hipocrisia\n      <b>D</b>\nMe achei melhor que o outro\n     <b>Bm7</b>\nSem perceber a trave\n       <b>Em7</b>\nQue estava no meu olho\n\n    <b>C</b>\nEm pele de ovelha\n  <b>D</b>\nAgindo como um lobo\n   <b>Bm7</b>\nMe esqueci do reino\n    <b>Em7</b>\nJuntando os meus tesouros\n\n[Refrao 1]\n\n<b>C7M</b>\nAh, Jesus\n\nQuebra o meu orgulho\n            <b>Bm7</b>\nE faz-me olhar pra cruz\n                      <b>Am7</b>\nTira a dureza do meu coracao\n\n                          <b>C7M</b>\nDe joelhos, eu imploro o Teu perdao\n\nPois Tua graca\n              <b>Bm7</b>\nJoga a minha carne ao chao\n                        <b>Am7</b>\nE me ensina o valor da comunhao\n                     <b>G/B</b>   <b>C7M</b>\nDo beber do vinho e partilhar do pao\n\n[Solo 1] <b>C7M</b>  <b>G/B</b>  <b>Am7</b>\n\n[Segunda Parte]\n\n<b>C7M</b>               <b>Bm</b>\nEu sou o vaso, Tu es o oleiro\n  <b>Am7</b>                  <b>G/B</b>\nQuebra minha vida, me refaz por inteiro\n <b>C7M</b>                 <b>Bm</b>\nTomo a minha cruz e nego a mim mesmo\n <b>Am7</b>                    <b>G/B</b>\nPois do pecado nao sou mais prisioneiro\n\n<b>C7M</b>               <b>Bm</b>\nEu sou o vaso, Tu es o oleiro\n  <b>Am7</b>                  <b>G/B</b>\nQuebra minha vida, me refaz por inteiro\n <b>C7M</b>                 <b>Bm</b>\nTomo a minha cruz e nego a mim mesmo\n <b>Am7</b>                    <b>G/B</b>\nPois do pecado nao sou mais prisioneiro\n\n[Pre-Refrao 2]\n\n <b>C7M</b>                   <b>G/B</b>\nMesmo com falhas, esse e o meu desejo\n <b>Am7</b>      <b>G/B</b>  <b>C</b>     <b>D</b>      <b>G</b>\nDa-me um coracao igual ao Teu\n\n[Refrao 2]\n\n <b>G</b>                  <b>G/B</b>    <b>C</b>\nDa-me um coracao igual ao Teu\n     <b>D</b>\nMeu Mestre\n <b>G</b>                  <b>G/B</b>    <b>C</b>\nDa-me um coracao igual ao Teu\n     <b>D</b>               <b>G/B</b>  <b>Em7</b>\nCoracao disposto a obedecer\n     <b>G/B</b>               <b>Em7</b>\nCumprir todo o Teu querer\n <b>Am7</b>      <b>G/B</b>  <b>C</b>     <b>D</b>      <b>G</b>\nDa-me um coracao igual ao Teu\n\n                   <b>G/B</b>   <b>C</b>\nDa-me um coracao igual ao Teu\n     <b>D</b>\nMeu Mestre\n <b>G</b>                  <b>G/B</b>    <b>C</b>\nDa-me um coracao igual ao Teu\n     <b>D</b>               <b>G/B</b>  <b>Em7</b>\nCoracao disposto a obedecer\n     <b>G/B</b>               <b>Em7</b>\nCumprir todo o Teu querer\n <b>Am7</b>      <b>G/B</b>  <b>C</b>     <b>D</b>      <b>C7M</b>\nDa-me um coracao igual ao Teu\n\n[Refrao 1]\n\nJesus\n\nQuebra o meu orgulho\n            <b>G/B</b>\nE faz-me olhar pra cruz\n                      <b>Am7</b>\nTira a dureza do meu coracao\n\n                          <b>C7M</b>\nDe joelhos, eu imploro o Teu perdao\n\nPois Tua graca\n              <b>G/B</b>\nJoga a minha carne ao chao\n                        <b>Am7</b>\nE me ensina o valor da comunhao\n                            <b>C7M</b>\nDo beber do vinho e partilhar do pao\n\n[Ponte]\n\n       <b>C7M</b>\nJudas veio ao Teu encontro\n        <b>G/B</b>\nCom a traicao pesando\n        <b>Am7</b>\nMas Te vejo se inclinando\n              <b>G/B</b>\nE os pes do traidor lavando\n\n      <b>C7M</b>\nVejo Pedro Te negando\n     <b>G/B</b>\nE o galo entao cantando\n         <b>Am7</b>\nMesmo assim, Tu dizes:\n           <b>G/B</b>\nPedro, apascenta o meu rebanho\n\n[Pre-Refrao 3]\n\n        <b>C7M</b>\nQuebrantado, estou chorando\n      <b>G/B</b>\nMinha alma esta clamando\n<b>Am7</b>      <b>G/B</b>  <b>C</b>     <b>D</b>      <b>G</b>\nDa-me um coracao igual ao Teu\n\n[Refrao 2]\n\n <b>G</b>                  <b>G/B</b>    <b>C</b>\nDa-me um coracao igual ao Teu\n     <b>D</b>\nMeu Mestre\n <b>G</b>                  <b>G/B</b>    <b>C</b>\nDa-me um coracao igual ao Teu\n     <b>D</b>               <b>G/B</b>  <b>Em7</b>\nCoracao disposto a obedecer\n     <b>G/B</b>               <b>Em7</b>\nCumprir todo o Teu querer\n <b>Am7</b>      <b>G/B</b>  <b>C</b>     <b>D</b>      <b>G</b>\nDa-me um coracao igual ao Teu\n\n[Refrao Final]\n\nJesus\n\nQuebra o meu orgulho\n            <b>G/B</b>\nE faz-me olhar pra cruz\n                      <b>Am7</b>\nTira a dureza do meu coracao\n                  <b>G/B</b>  <b>C7M</b>\nDe joelhos, eu imploro o Teu perdao\n\nPois Tua graca\n              <b>G/B</b>\nJoga a minha carne ao chao\n                        <b>Am7</b>\nE me ensina o valor da comunhao\n                            <b>G/B</b>\nDo beber do vinho e partilhar do pao\n\n[Final] <b>C7M</b>  <b>G/B</b>  <b>Em7</b>  <b>C7M</b>`

function App() {
  const params = useParams()
  const navigate = useNavigate()
  const [autoScrollSpeed, setAutoScrollSpeed] = useState(5)
  const [isScrolling, setIsScrolling] = useState(false)
  const [fontSize, setFontSize] = useState(15)
  const [transposeOffset, setTransposeOffset] = useState(0)
  const [formaTom, setFormaTom] = useState(null)
  const [simplifyChords, setSimplifyChords] = useState(false)
  const [violinMode, setViolinMode] = useState(false)
  const [capo, setCapo] = useState(0)
  const [tuning, setTuning] = useState('standard')
  const [metronomeBpm, setMetronomeBpm] = useState(100)
  const [isMetronomePlaying, setIsMetronomePlaying] = useState(false)
  const [selectedChord, setSelectedChord] = useState('')
  const [tomIsMinor, setTomIsMinor] = useState(false)

  const [songs, setSongs] = useState([])
  const [showAddModal, setShowAddModal] = useState(false)
  const [newSongName, setNewSongName] = useState('')
  const [newSongComposer, setNewSongComposer] = useState('')
  const [newSongFile, setNewSongFile] = useState(null)
  const [newSongYoutubeUrl, setNewSongYoutubeUrl] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [showSearchResults, setShowSearchResults] = useState(false)
  const [selectedSongId, setSelectedSongId] = useState(null)
  const [showMySongs, setShowMySongs] = useState(false)
  const [songFilter, setSongFilter] = useState('')
  const [deleteConfirmId, setDeleteConfirmId] = useState(null)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const { user, setUser, userIsAdmin, setUserIsAdmin, userLists, setUserLists } = useAuth()
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [showEmailForm, setShowEmailForm] = useState(false)
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [loginLoading, setLoginLoading] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showSuggestionModal, setShowSuggestionModal] = useState(false)
  const [suggSong, setSuggSong] = useState('')
  const [suggUrl, setSuggUrl] = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [showSuggestionsList, setShowSuggestionsList] = useState(false)
  const [userSuggestions, setUserSuggestions] = useState([])
  const [showUserSuggestions, setShowUserSuggestions] = useState(false)
  const [showListsModal, setShowListsModal] = useState(false)
  const [showCreateListModal, setShowCreateListModal] = useState(false)
  const [showEditListModal, setShowEditListModal] = useState(false)
  const [showPlaylistModal, setShowPlaylistModal] = useState(false)
  const [showDomingoModal, setShowDomingoModal] = useState(false)
  const [domingoList, setDomingoList] = useState(null)
  const [isEditingDomingo, setIsEditingDomingo] = useState(false)
  const [activeMobilePanel, setActiveMobilePanel] = useState(null)
  const [newListName, setNewListName] = useState('')
  const [selectedSongs, setSelectedSongs] = useState([])
  const [editingList, setEditingList] = useState(null)
  const [currentPlaylist, setCurrentPlaylist] = useState(null)
  const [currentPlaylistIndex, setCurrentPlaylistIndex] = useState(0)

  const scrollRef = useRef(null)
  const metronomeRef = useRef(null)
  const audioCtxRef = useRef(null)
  const searchRef = useRef(null)
  const fileInputRef = useRef(null)
  const userMenuRef = useRef(null)

  useEffect(() => {
    if (localStorage.getItem('theme') === 'dark') {
      document.documentElement.classList.add('dark')
    }
  }, [])

  useEffect(() => {
    fetchSongs().then(data => {
      if (data && data.length > 0) {
        setSongs(data)
      }
    })

    const shouldLoadPlaylist = sessionStorage.getItem('loadPlaylistFromUrl') === 'true'
    sessionStorage.removeItem('loadPlaylistFromUrl')

    if (!params.songId || shouldLoadPlaylist) {
      const storedPlaylist = sessionStorage.getItem('currentPlaylist')
      const storedIndex = sessionStorage.getItem('currentPlaylistIndex')
      if (storedPlaylist) {
        setCurrentPlaylist(JSON.parse(storedPlaylist))
        setCurrentPlaylistIndex(parseInt(storedIndex) || 0)
      }
    }

    fetchDomingoList().then(data => setDomingoList(data))
  }, [])

  useEffect(() => {
    if (songs.length > 0 && params.songId) {
      const song = songs.find(s => s.id.toString() === params.songId)
      if (song) setSelectedSongId(song.id)
    }
    if (!currentPlaylist) {
      const storedPlaylist = sessionStorage.getItem('currentPlaylist')
      if (storedPlaylist) {
        setCurrentPlaylist(JSON.parse(storedPlaylist))
        const storedIndex = sessionStorage.getItem('currentPlaylistIndex')
        if (storedIndex) setCurrentPlaylistIndex(parseInt(storedIndex))
      }
    }
  }, [params.songId, songs, currentPlaylist])

  // Apply tone from playlist when playing a song from the playlist
  useEffect(() => {
    if (currentPlaylist && selectedSongId && songs.length > 0) {
      const currentSongData = songs.find(s => s.id === selectedSongId)
      if (currentSongData) {
        const currentItem = currentPlaylist.song_ids[currentPlaylistIndex]
        const parsed = parseSongIdItem(currentItem)
        if (parsed && parsed.tom && parsed.songId === currentSongData.id) {
          const songKey = currentSongData.key || ORIGINAL_KEY
          const offset = getTransposeOffsetFromNotes(songKey, parsed.tom)
          setTransposeOffset(offset)
          setTomIsMinor(parsed.tom.endsWith('m'))
        }
      }
    }
  }, [currentPlaylist, currentPlaylistIndex, selectedSongId, songs])

  // Extract forma dos acordes from song content
  useEffect(() => {
    if (selectedSongId && songs.length > 0) {
      const song = songs.find(s => s.id === selectedSongId)
      if (song && song.content) {
        const { formaTom } = extractTomInfo(song.content)
        setFormaTom(formaTom)
      }
    }
  }, [selectedSongId, songs])

  const searchResults = searchQuery.trim()
    ? songs.filter(s =>
        s.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : []

  const avatarUrl = user?.user_metadata?.avatar_url || user?.user_metadata?.picture || ''
  const displayName = user?.user_metadata?.full_name || user?.email || ''
  const avatarLetter = displayName ? displayName[0].toUpperCase() : '?'

  const loadSongContent = useCallback((id, fromPlaylist = false) => {
    setSelectedSongId(id)
    setShowSearchResults(false)
    setSearchQuery('')
    if (!fromPlaylist) {
      setTransposeOffset(0)
      setTomIsMinor(false)
    }
    setFormaTom(null)
    setSimplifyChords(false)
    setCapo(0)
    setIsScrolling(false)
  }, [])

  useEffect(() => {
    function handleClickOutside(e) {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowSearchResults(false)
      }
      
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
    const detectedKey = detectKey(content)
    const saved = await saveSong(newSongName.trim(), content, newSongYoutubeUrl.trim(), newSongComposer.trim(), detectedKey)
    if (saved) {
      setSongs(prev => [saved, ...prev])
      setShowAddModal(false)
      setNewSongName('')
      setNewSongComposer('')
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

  const requestDelete = (id) => {
    setDeleteConfirmId(id)
    setDeleteConfirmText('')
  }

  const confirmDelete = () => {
    if (deleteConfirmText.trim().toLowerCase() === 'confirmar' && deleteConfirmId) {
      handleDeleteSong(deleteConfirmId)
      setDeleteConfirmId(null)
      setDeleteConfirmText('')
    }
  }

  const currentSong = selectedSongId
    ? songs.find(s => s.id === selectedSongId)
    : null

  const currentRawHtml = currentSong
    ? (currentSong.content.includes('<b>') ? stripTomLine(currentSong.content) : convertPlainTextToHtml(stripTomLine(currentSong.content)))
    : RAW_CHORD_HTML
  const processedChordHtml = processChordHtml(currentRawHtml, transposeOffset, simplifyChords, violinMode)
  const currentKey = getKeyFromOffset(currentSong?.key || ORIGINAL_KEY, transposeOffset, tomIsMinor || undefined)
  const currentFormaTom = getFormaTomTransposed(formaTom, transposeOffset)

  const sortedSongs = [...songs].sort((a, b) => a.name.localeCompare(b.name, 'pt', { sensitivity: 'base' }))
  const filteredSongs = songFilter.trim()
    ? sortedSongs.filter(s => s.name.toLowerCase().includes(songFilter.toLowerCase()))
    : sortedSongs

  const handleChordClick = (e) => {
    if (e.target.tagName === 'B') {
      setSelectedChord(e.target.textContent)
    }
  }

  return (
    <div className="page-wrapper">
      <header className="header">
        <div className="container header-inner">
          <h1 className="header-logo"><Link to="/">Cifra Club</Link></h1>
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
                    <div className="search-result-info">
                      <span className="search-result-name">{song.name}</span>
                      {song.composer && <span className="search-result-composer">{song.composer}</span>}
                    </div>
                    {userIsAdmin && (
                      <button
                        className="search-result-delete"
                        onClick={e => { e.stopPropagation(); requestDelete(song.id) }}
                        title="Remover musica"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M18 6L6 18M6 6l12 12"/></svg>
                      </button>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
           <Navbar
             user={user}
             userIsAdmin={userIsAdmin}
             searchQuery={searchQuery}
             setSearchQuery={setSearchQuery}
             showSearchResults={showSearchResults}
             setShowSearchResults={setShowSearchResults}
             searchResults={searchResults}
             loadSongContent={loadSongContent}
             requestDelete={requestDelete}
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
             isViewingSong={!!selectedSongId}
             navigate={navigate}
           />
        </div>
      </header>

      {/* Mobile Nav - renderiza fora do header no mobile */}
      <Navbar
        user={user}
        userIsAdmin={userIsAdmin}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        showSearchResults={showSearchResults}
        setShowSearchResults={setShowSearchResults}
        searchResults={searchResults}
        loadSongContent={loadSongContent}
        requestDelete={requestDelete}
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
        isViewingSong={!!selectedSongId}
        navigate={navigate}
        isMobileNav={true}
        fetchSuggestions={fetchSuggestions}
        fetchUserSuggestions={fetchUserSuggestions}
      />

      <main>

        <div className="container cifra-page">
          <div className="cifra-header">
            <h1 className="cifra-title">{currentSong ? currentSong.name : 'Ah, Jesus / Coracao Igual Ao Teu'}</h1>
            <h2 className="cifra-artist">{currentSong ? (currentSong.composer || '') : <a href="/julliany-souza/">Julliany Souza</a>}</h2>
            <div className="cifra-meta">
              {currentPlaylist && (
                <div className="playlist-inline-controls">
                   <span className="playlist-name">{currentPlaylist.name}</span>
                    <button
                      className="playlist-nav-btn"
                      onClick={() => {
                        if (currentPlaylistIndex > 0) {
                          const newIndex = currentPlaylistIndex - 1
                          const currentItem = currentPlaylist.song_ids[newIndex]
                          const parsed = parseSongIdItem(currentItem)
                          const songId = parsed ? parsed.songId : currentItem
                          setCurrentPlaylistIndex(newIndex)
                          sessionStorage.setItem('currentPlaylist', JSON.stringify(currentPlaylist))
                          sessionStorage.setItem('currentPlaylistIndex', newIndex.toString())
                          navigate(`/${songId}`)
                        }
                      }}
                      disabled={currentPlaylistIndex === 0}
                      title="Anterior"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/></svg>
                    </button>
                    <button
                      className="playlist-nav-btn"
                      onClick={() => {
                        if (currentPlaylistIndex < currentPlaylist.song_ids?.length - 1) {
                          const newIndex = currentPlaylistIndex + 1
                          const currentItem = currentPlaylist.song_ids[newIndex]
                          const parsed = parseSongIdItem(currentItem)
                          const songId = parsed ? parsed.songId : currentItem
                          setCurrentPlaylistIndex(newIndex)
                          sessionStorage.setItem('currentPlaylist', JSON.stringify(currentPlaylist))
                          sessionStorage.setItem('currentPlaylistIndex', newIndex.toString())
                          navigate(`/${songId}`)
                        }
                      }}
                      disabled={currentPlaylistIndex >= currentPlaylist.song_ids?.length - 1}
                      title="Proxima"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg>
                    </button>
                 </div>
              )}
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
                  {currentFormaTom && <span> - forma dos acordes no tom de {currentFormaTom}</span>}
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
                <h3 className="sidebar-title">Violino</h3>
                <label className="toggle-switch">
                  <input type="checkbox" checked={violinMode} onChange={(e) => setViolinMode(e.target.checked)} />
                  <span className="toggle-track"></span>
                </label>
                <span className="tool-hint">{violinMode ? 'Terça' : 'Desativado'}</span>
              </div>

              <div className="sidebar-section">
                <h3 className="sidebar-title">Capotraste</h3>
                <div className="tool-row">
                  <button className="tool-btn" onClick={() => setCapo(c => Math.max(0, c - 1))} title="Diminuir casa">−</button>
                  <span className="tool-value">{capo}ª</span>
                  <button className="tool-btn" onClick={() => setCapo(c => Math.min(12, c + 1))} title="Aumentar casa">+</button>
                </div>
                <div className="tool-hint">
                  {capo > 0 && <span>Tom real: {getKeyFromOffset(currentSong?.key || ORIGINAL_KEY, transposeOffset - capo)}</span>}
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
                  {currentFormaTom && (
                    <span title="forma dos acordes"> (forma dos acordes no tom de {currentFormaTom})</span>
                  )}
                </div>
                <pre onClick={handleChordClick} dangerouslySetInnerHTML={{
                  __html: processedChordHtml
                }} />
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
              <label className="modal-label">Compositor</label>
              <input
                className="modal-input"
                type="text"
                placeholder="Digite o nome do compositor"
                value={newSongComposer}
                onChange={e => setNewSongComposer(e.target.value)}
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
        <div className="modal-overlay" onClick={() => { setShowLoginModal(false); setShowEmailForm(false) }}>
          <div className="modal modal-login" onClick={e => e.stopPropagation()}>
            {!showEmailForm ? (
              <>
                <div className="modal-login-icon">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="1.5"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
                </div>
                <h2 className="modal-title">Bem-vindo ao Cifras</h2>
                <p className="modal-login-desc">
                  Este site e exclusivo para os membros do louvor da <strong>Igreja Caminho da Restauracao</strong>.
                  Faca login com sua conta Google ou com email/senha para acessar e gerenciar as cifras.
                </p>
                <button className="btn-google" onClick={() => { signInWithGoogle(); setShowLoginModal(false) }}>
                  <svg viewBox="0 0 24 24" width="20" height="20"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                  Entrar com Google
                </button>
                <button className="btn-signup" onClick={() => setShowEmailForm(true)}>
                  Entrar com email
                </button>
                <div className="modal-actions">
                  <button className="modal-btn modal-btn-cancel" onClick={() => setShowLoginModal(false)}>Cancelar</button>
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
                        const { signInWithEmail, createUser } = await import('./supabase')
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
              {filteredSongs.length === 0 ? (
                <p className="modal-empty">Nenhuma musica encontrada.</p>
              ) : (
                <div className="my-songs-list">
                  {filteredSongs.map(song => (
                    <div key={song.id} className="my-song-item">
                      <button
                        className="my-song-name"
                        onClick={() => {
                          loadSongContent(song.id)
                          setShowMySongs(false)
                        }}
                      >
                        <span className="my-song-title">{song.name}</span>
                        {song.composer && <span className="my-song-composer">{song.composer}</span>}
                      </button>
                      {userIsAdmin && (
                        <button
                          className="my-song-delete"
                          onClick={() => requestDelete(song.id)}
                          title="Remover musica"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M18 6L6 18M6 6l12 12"/></svg>
                        </button>
                      )}
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
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
            <div className="modal-actions">
              <button className="modal-btn modal-btn-confirm" onClick={() => setShowSuggestionModal(true)}>Adicionar sugestao</button>
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
                          <span className="suggestion-user">por {s.user_name}</span>
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

      {deleteConfirmId && (
        <div className="modal-overlay" onClick={() => { setDeleteConfirmId(null); setDeleteConfirmText('') }}>
          <div className="modal modal-sm" onClick={e => e.stopPropagation()}>
            <h2 className="modal-title">Remover musica</h2>
            <div className="modal-body">
              <p className="modal-text">Voce realmente quer remover a musica?</p>
              <label className="modal-label">Digite <strong>confirmar</strong> para prosseguir</label>
              <input
                className="modal-input"
                type="text"
                placeholder='digite "confirmar"'
                value={deleteConfirmText}
                onChange={e => setDeleteConfirmText(e.target.value)}
                autoFocus
              />
            </div>
            <div className="modal-actions">
              <button className="modal-btn modal-btn-cancel" onClick={() => { setDeleteConfirmId(null); setDeleteConfirmText('') }}>Cancelar</button>
              <button
                className="modal-btn modal-btn-danger"
                onClick={confirmDelete}
                disabled={deleteConfirmText.trim().toLowerCase() !== 'confirmar'}
              >
                Remover
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
                          setCurrentPlaylist(list)
                          setCurrentPlaylistIndex(0)
                          setShowListsModal(false)
                          setShowPlaylistModal(true)
                        }}
                      >
                        {list.name}
                        <span className="list-item-count">({list.song_ids?.length || 0} musicas)</span>
                      </button>
                      <div className="list-item-actions">
                        <button className="list-edit-btn" onClick={() => { setEditingList(list); setNewListName(list.name); setSelectedSongs(list.song_ids || []); setShowEditListModal(true) }}>Editar</button>
                        <button className="list-delete-btn" onClick={async () => { await deleteList(list.id); setUserLists(prev => prev.filter(l => l.id !== list.id)) }}>Excluir</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="modal-actions">
              {user && (
                <button className="modal-btn modal-btn-confirm" onClick={() => { setNewListName(''); setSelectedSongs([]); setShowCreateListModal(true) }}>
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
                  <div key={song.id} className="song-select-item-wrap">
                    <label className="song-select-item">
                      <input
                        type="checkbox"
                        checked={selectedSongs.some(s => {
                          const parsed = parseSongIdItem(s)
                          return parsed && parsed.songId === song.id
                        })}
                        onChange={() => setSelectedSongs(prev => {
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
                            return [...prev, JSON.stringify({ songId: song.id, tom: song.key || 'G' })]
                          }
                        })}
                      />
                      <span>{song.name}</span>
                    </label>
                    {selectedSongs.some(s => {
                      const parsed = parseSongIdItem(s)
                      return parsed && parsed.songId === song.id
                    }) && (
                      <select
                        className="tom-select"
                        value={(() => {
                          const found = selectedSongs.find(s => {
                            const parsed = parseSongIdItem(s)
                            return parsed && parsed.songId === song.id
                          })
                          const parsed = parseSongIdItem(found)
                          return (parsed && parsed.tom) || song.key || 'G'
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
                      >
                        {KEYS.map(k => <option key={k} value={k}>{k}</option>)}
                      </select>
                    )}
                  </div>
                ))}
              </div>
            </div>
            <div className="modal-actions">
              <button className="modal-btn modal-btn-cancel" onClick={() => setShowCreateListModal(false)}>Cancelar</button>
              <button
                className="modal-btn modal-btn-confirm"
                onClick={async () => {
                  if (!newListName.trim() || !user?.email) return
                  await createList(newListName.trim(), user.email, selectedSongs)
                  setNewListName('')
                  setSelectedSongs([])
                  setShowCreateListModal(false)
                  fetchUserLists(user.email).then(setUserLists)
                }}
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
                  <div key={song.id} className="song-select-item-wrap">
                    <label className="song-select-item">
                      <input
                        type="checkbox"
                        checked={selectedSongs.some(s => {
                          const parsed = parseSongIdItem(s)
                          return parsed && parsed.songId === song.id
                        })}
                        onChange={() => setSelectedSongs(prev => {
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
                            return [...prev, JSON.stringify({ songId: song.id, tom: song.key || 'G' })]
                          }
                        })}
                      />
                      <span>{song.name}</span>
                    </label>
                    {selectedSongs.some(s => {
                      const parsed = parseSongIdItem(s)
                      return parsed && parsed.songId === song.id
                    }) && (
                      <select
                        className="tom-select"
                        value={(() => {
                          const found = selectedSongs.find(s => {
                            const parsed = parseSongIdItem(s)
                            return parsed && parsed.songId === song.id
                          })
                          const parsed = parseSongIdItem(found)
                          return (parsed && parsed.tom) || song.key || 'G'
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
                      >
                        {KEYS.map(k => <option key={k} value={k}>{k}</option>)}
                      </select>
                    )}
                  </div>
                ))}
              </div>
            </div>
            <div className="modal-actions">
              <button className="modal-btn modal-btn-cancel" onClick={() => setShowEditListModal(false)}>Cancelar</button>
              <button
                className="modal-btn modal-btn-confirm"
                onClick={async () => {
                  if (!editingList || !newListName.trim()) return
                  await updateList(editingList.id, newListName.trim(), selectedSongs)
                  setEditingList(null)
                  setNewListName('')
                  setSelectedSongs([])
                  setShowEditListModal(false)
                  fetchUserLists(user.email).then(setUserLists)
                }}
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
                        setSelectedSongId(song.id)
                        setCurrentPlaylistIndex(index)
                        sessionStorage.setItem('currentPlaylist', JSON.stringify(currentPlaylist))
                        sessionStorage.setItem('currentPlaylistIndex', index.toString())
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
        <div className="modal-overlay" onClick={() => { setShowDomingoModal(false); setIsEditingDomingo(false); }}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
            <h2 className="modal-title">Esse Domingo</h2>
            <div className="modal-body">
              {userIsAdmin ? (
                <>
                  {domingoList && !isEditingDomingo ? (
                    <>
                      <p className="modal-text">Lista atual. Clique em uma musica para tocar.</p>
                      <div className="playlist-songs">
                        {domingoList.song_ids?.map((item, index) => {
                          const parsed = parseSongIdItem(item)
                          if (!parsed) return null
                          const { songId, tom } = parsed
                          const song = songs.find(s => s.id === songId)
                          if (!song) return null
                          return (
                            <button
                              key={song.id}
                              className="playlist-song-item"
                            onClick={() => {
                              setCurrentPlaylist(domingoList)
                              setCurrentPlaylistIndex(index)
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
                      <p className="modal-text">Selecione as musicas e o tom para o culto de domingo:</p>
                      <div className="song-select-list">
                        {songs.map(song => (
                          <div key={song.id} className="song-select-item-wrap">
                            <label className="song-select-item">
                              <input
                                type="checkbox"
                                checked={selectedSongs.some(s => {
                                  const parsed = parseSongIdItem(s)
                                  return parsed && parsed.songId === song.id
                                })}
                                onChange={() => setSelectedSongs(prev => {
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
                                    return [...prev, JSON.stringify({ songId: song.id, tom: song.key || 'G' })]
                                  }
                                })}
                              />
                              <span>{song.name}</span>
                            </label>
                            {selectedSongs.some(s => {
                              const parsed = parseSongIdItem(s)
                              return parsed && parsed.songId === song.id
                            }) && (
                              <select
                                className="tom-select"
                                value={(() => {
                                  const found = selectedSongs.find(s => {
                                    const parsed = parseSongIdItem(s)
                                    return parsed && parsed.songId === song.id
                                  })
                                  const parsed = parseSongIdItem(found)
                                  return (parsed && parsed.tom) || song.key || 'G'
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
                              >
                                {KEYS.map(k => <option key={k} value={k}>{k}</option>)}
                              </select>
                            )}
                          </div>
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
                      {domingoList.song_ids?.map((item, index) => {
                        const parsed = parseSongIdItem(item)
                        if (!parsed) return null
                        const { songId, tom } = parsed
                        const song = songs.find(s => s.id === songId)
                        if (!song) return null
                        return (
                          <button
                            key={song.id}
                            className="playlist-song-item"
                            onClick={() => {
                              setCurrentPlaylist(domingoList)
                              setCurrentPlaylistIndex(index)
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
                    <p className="modal-text">Nenhuma lista agendada ainda.</p>
                  )}
                </>
              )}
            </div>
            <div className="modal-actions">
              {isEditingDomingo ? (
                <>
                  <button className="modal-btn modal-btn-cancel" onClick={() => setIsEditingDomingo(false)}>Voltar</button>
                  <button
                    className="modal-btn modal-btn-confirm"
                    onClick={async () => {
                      if (!domingoList) return
                      await updateList(domingoList.id, 'Esse Domingo', selectedSongs)
                      setDomingoList({ ...domingoList, song_ids: selectedSongs })
                      setSelectedSongs([])
                      setIsEditingDomingo(false)
                    }}
                    disabled={selectedSongs.length === 0}
                  >
                    Salvar alteracoes
                  </button>
                </>
              ) : (
                <>
                  <button className="modal-btn modal-btn-cancel" onClick={() => { setShowDomingoModal(false); setIsEditingDomingo(false); }}>Fechar</button>
                  {userIsAdmin && (
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
                </>
              )}
            </div>
          </div>
        </div>
      )}
      {/* MOBILE BOTTOM MENU AND FLOATING PANELS */}
      {activeMobilePanel && (
        <div className="mobile-menu-panel">
          <div className="mobile-panel-header">
            <h4 className="mobile-panel-title">
              {activeMobilePanel === 'tom' && 'Alterar Tom'}
              {activeMobilePanel === 'rolagem' && 'Auto Rolagem'}
              {activeMobilePanel === 'ouvir' && 'Ouvir Música'}
              {activeMobilePanel === 'opcoes' && 'Mais Opções'}
            </h4>
            <button className="mobile-panel-close" onClick={() => setActiveMobilePanel(null)}>×</button>
          </div>
          
          <div className="mobile-panel-body">
            {activeMobilePanel === 'tom' && (
              <div className="mobile-panel-content">
                <div className="mobile-tool-row">
                  <button className="mobile-tool-btn" onClick={() => setTransposeOffset(t => Math.max(-6, t - 1))}>−</button>
                  <span className="mobile-tool-value">{currentKey}</span>
                  <button className="mobile-tool-btn" onClick={() => setTransposeOffset(t => Math.min(6, t + 1))}>+</button>
                </div>
                {currentFormaTom && (
                  <div className="mobile-panel-hint" style={{ marginTop: '8px' }}>forma dos acordes no tom de {currentFormaTom}</div>
                )}
                {transposeOffset !== 0 && (
                  <div className="mobile-panel-hint">({transposeOffset > 0 ? '+' : ''}{transposeOffset} semitons)</div>
                )}
              </div>
            )}

            {activeMobilePanel === 'rolagem' && (
              <div className="mobile-panel-content">
                <div className="mobile-tool-row">
                  <button className={`mobile-tool-btn-play ${isScrolling ? 'active' : ''}`} onClick={() => setIsScrolling(s => !s)}>
                    {isScrolling ? 'Pausar Rolagem' : 'Iniciar Rolagem'}
                  </button>
                </div>
                <div className="mobile-slider-row">
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                    <span>Velocidade</span>
                    <span>{autoScrollSpeed}</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={autoScrollSpeed}
                    onChange={(e) => setAutoScrollSpeed(Number(e.target.value))}
                    className="mobile-slider"
                  />
                </div>
              </div>
            )}

            {activeMobilePanel === 'ouvir' && (
              <div className="mobile-panel-content">
                <div className="mobile-player-container">
                  {(() => {
                    const videoId = currentSong ? getYoutubeId(currentSong.youtube_url) : 'ldK43s9UyQI'
                    return videoId ? (
                      <iframe
                        src={`https://www.youtube.com/embed/${videoId}`}
                        title="YouTube video player"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    ) : (
                      <div style={{ padding: '20px', textAlign: 'center', color: '#999' }}>
                        Nenhum vídeo disponível
                      </div>
                    )
                  })()}
                </div>
              </div>
            )}

            {activeMobilePanel === 'opcoes' && (
              <div className="mobile-panel-content mobile-panel-grid">
                <div className="mobile-panel-item">
                  <span>Simplificar Acordes</span>
                  <label className="toggle-switch">
                    <input type="checkbox" checked={simplifyChords} onChange={(e) => setSimplifyChords(e.target.checked)} />
                    <span className="toggle-track"></span>
                  </label>
                </div>

                <div className="mobile-panel-item">
                  <span>Violino</span>
                  <label className="toggle-switch">
                    <input type="checkbox" checked={violinMode} onChange={(e) => setViolinMode(e.target.checked)} />
                    <span className="toggle-track"></span>
                  </label>
                </div>

                <div className="mobile-panel-item">
                  <span>Capotraste</span>
                  <div className="mobile-tool-row-small">
                    <button className="mobile-tool-btn-small" onClick={() => setCapo(c => Math.max(0, c - 1))}>−</button>
                    <span className="mobile-tool-value-small">{capo}ª</span>
                    <button className="mobile-tool-btn-small" onClick={() => setCapo(c => Math.min(12, c + 1))}>+</button>
                  </div>
                </div>

                <div className="mobile-panel-item">
                  <span>Metrônomo ({metronomeBpm} BPM)</span>
                  <div className="mobile-tool-row-small">
                    <button className={`mobile-tool-btn-small ${isMetronomePlaying ? 'active' : ''}`} onClick={() => setIsMetronomePlaying(s => !s)}>
                      {isMetronomePlaying ? '⏹' : '▶'}
                    </button>
                    <input
                      type="range"
                      min="40"
                      max="240"
                      value={metronomeBpm}
                      onChange={(e) => setMetronomeBpm(Number(e.target.value))}
                      className="mobile-slider-small"
                    />
                  </div>
                </div>

                <div className="mobile-panel-item">
                  <span>Tamanho da Fonte ({fontSize}px)</span>
                  <input
                    type="range"
                    min="12"
                    max="24"
                    value={fontSize}
                    onChange={(e) => setFontSize(Number(e.target.value))}
                    className="mobile-slider-small"
                  />
                </div>

                <div className="mobile-panel-item">
                  <span>Afinação</span>
                  <select className="mobile-select" value={tuning} onChange={(e) => setTuning(e.target.value)}>
                    {Object.entries(TUNINGS).map(([key, label]) => (
                      <option key={key} value={key}>{key.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="mobile-bottom-bar">
        <button
          className={`mobile-menu-item ${showPlaylistModal ? 'active' : ''}`}
          onClick={() => {
            setActiveMobilePanel(null);
            if (currentPlaylist) {
              setShowPlaylistModal(true);
            } else {
              setShowListsModal(true);
            }
          }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="8" y1="6" x2="21" y2="6"></line>
            <line x1="8" y1="12" x2="21" y2="12"></line>
            <line x1="8" y1="18" x2="21" y2="18"></line>
            <line x1="3" y1="6" x2="3.01" y2="6"></line>
            <line x1="3" y1="12" x2="3.01" y2="12"></line>
            <line x1="3" y1="18" x2="3.01" y2="18"></line>
          </svg>
          <span>Lista</span>
        </button>

        <button
          className={`mobile-menu-item ${activeMobilePanel === 'tom' ? 'active' : ''}`}
          onClick={() => setActiveMobilePanel(prev => prev === 'tom' ? null : 'tom')}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="6" ry="6"></rect>
            <line x1="12" y1="7" x2="12" y2="13"></line>
            <line x1="9" y1="10" x2="15" y2="10"></line>
            <line x1="9" y1="16" x2="15" y2="16"></line>
          </svg>
          <span>Tom</span>
        </button>

        <button
          className={`mobile-menu-item ${activeMobilePanel === 'rolagem' ? 'active' : ''}`}
          onClick={() => setActiveMobilePanel(prev => prev === 'rolagem' ? null : 'rolagem')}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="6" ry="6"></rect>
            <polyline points="8 9 12 13 16 9"></polyline>
            <polyline points="8 13 12 17 16 13"></polyline>
          </svg>
          <span>Rolagem</span>
        </button>

        <button
          className={`mobile-menu-item ${activeMobilePanel === 'ouvir' ? 'active' : ''}`}
          onClick={() => setActiveMobilePanel(prev => prev === 'ouvir' ? null : 'ouvir')}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <polygon points="10 8 16 12 10 16 10 8"></polygon>
          </svg>
          <span>Ouvir</span>
        </button>

        <button
          className={`mobile-menu-item ${activeMobilePanel === 'opcoes' ? 'active' : ''}`}
          onClick={() => setActiveMobilePanel(prev => prev === 'opcoes' ? null : 'opcoes')}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="7" cy="7" r="2"></circle>
            <circle cx="17" cy="7" r="2"></circle>
            <circle cx="7" cy="17" r="2"></circle>
            <circle cx="17" cy="17" r="2"></circle>
            <line x1="12" y1="10" x2="12" y2="14"></line>
            <line x1="10" y1="12" x2="14" y2="12"></line>
          </svg>
          <span>Opções</span>
        </button>
      </div>
    </div>
  )
}

export default App
