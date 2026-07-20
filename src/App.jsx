import React, { useState, useRef, useEffect, useCallback, useMemo, Fragment } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { fetchSongs, saveSong, updateSong, deleteSong, signOut, fetchSuggestions, saveSuggestion, deleteSuggestion, updateSuggestionStatus, fetchUserSuggestions, fetchUserLists, createList, updateList, deleteList, fetchDomingoList, supabase, createUser, signInWithEmail } from './supabase'
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

function safeParseJson(value, fallback = null) {
  if (!value) return fallback
  try {
    return JSON.parse(value)
  } catch (error) {
    return fallback
  }
}

const FLAT_TO_SHARP = { 'Db': 'C#', 'Eb': 'D#', 'Gb': 'F#', 'Ab': 'G#', 'Bb': 'A#', 'Cb': 'B' }

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

function flipChordQuality(chordStr) {
  const m = chordStr.match(/^([A-Ga-g][#b]?)(.*)$/)
  if (!m) return chordStr
  const root = m[1]
  const suffix = m[2]
  const isMinor = /^m(?!aj)/i.test(suffix)
  if (isMinor) {
    return root + suffix.replace(/^m/, '')
  }
  if (/^maj\d*$/i.test(suffix)) {
    return root + 'm' + suffix.replace(/^maj/i, '')
  }
  if (/^M\d*$/i.test(suffix)) {
    return root + 'm' + suffix.replace(/^M/, '')
  }
  return root + 'm' + suffix
}

function chordToThird(chordStr) {
  const root = chordStr.match(/^([A-Ga-g][#b]?)/)
  if (!root) return chordStr
  const base = normalizeNote(root[1])
  const rest = chordStr.slice(root[1].length)
  const isMinor = rest.startsWith('m') || rest.startsWith('dim') || rest.startsWith('Â°')
  const offset = isMinor ? 3 : 4
  return transposeNote(base, offset)
}

function processChordHtml(html, transposeOffset, simplify, violin, flipQuality, singerMode) {
  if (transposeOffset === 0 && !simplify && !violin && !flipQuality && !singerMode) return html
  return html.replace(/<b>([^<]+)<\/b>/g, (_, chordText) => {
    if (singerMode) return '<b></b>'
    let c = chordText.trim()
    if (transposeOffset !== 0) c = transposeChordString(c, transposeOffset)
    if (flipQuality) c = flipChordQuality(c)
    if (violin) c = chordToThird(c)
    else if (simplify) c = simplifyChordString(c)
    return `<b>${c}</b>`
  })
}

function getKeyFromOffset(originalKey, offset, forceMinor) {
  if (!originalKey) return originalKey || ''
  const isMinor = forceMinor !== undefined ? forceMinor : originalKey.endsWith('m')
  const root = originalKey.endsWith('m') ? originalKey.slice(0, -1) : originalKey
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
  useEffect(() => {
    return () => {
      if (padAudioRef.current) { padAudioRef.current.pause(); padAudioRef.current = null; }
    };
  }, []);

  return (idx2 - idx1 + 12) % 12
}

function getFormaTomTransposed(originalFormaTom, offset) {
  if (!originalFormaTom) return null
  return getKeyFromOffset(originalFormaTom, offset)
}

function sanitizeHtml(text) {
  if (!text) return ''
  let escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
  return escaped
    .replace(/&lt;b&gt;/gi, '<b>')
    .replace(/&lt;\/b&gt;/gi, '</b>')
}

function convertPlainTextToHtml(text) {
  const chordPattern = /^\(?[A-G][#b]?(?:m|M|maj|Maj|dim|aug|sus|add|Â°|Âº|\+|Ã¸|7M)?[0-9]*(?:sus[0-9]*|add[0-9]*|[b#][0-9]+|\+[0-9]*|aug|dim|Â°|Âº|-[0-9]*)*(?:\([^)]*\))*(?:\/[A-G][#b]?(?:m|M|maj|Maj|dim|aug|sus|add|Â°|Âº|\+|Ã¸|7M)?[0-9]*(?:sus[0-9]*|add[0-9]*|[b#][0-9]+|\+[0-9]*|aug|dim|Â°|Âº|-[0-9]*)*)*\)?$/
  const sectionPattern = /^\[.*\]$/
  return text.split('\n').map(line => {
    const trimmed = line.trim()
    if (!trimmed) return line
    const tokens = trimmed.split(/\s+/)
    const isChordLine = tokens.every(t => chordPattern.test(t) || sectionPattern.test(t) || /^\d+x?$|^[\|:]+$|^(?:Riff|Solo|Fine|Coda|D\.?[CS]\.?)$|[\[\]]/i.test(t))
    if (!isChordLine) return line
    return line.replace(/\b(\(?)([A-G][#b]?(?:m|M|maj|Maj|dim|aug|sus|add|Â°|Âº|\+|Ã¸|7M)?[0-9]*(?:sus[0-9]*|add[0-9]*|[b#][0-9]+|\+[0-9]*|aug|dim|Â°|Âº|-[0-9]*)*(?:\([^)]*\))?(?:\/[A-G][#b]?(?:m|M|maj|Maj|dim|aug|sus|add|Â°|Âº|\+|Ã¸|7M)?[0-9]*(?:sus[0-9]*|add[0-9]*|[b#][0-9]+|\+[0-9]*|aug|dim|Â°|Âº|-[0-9]*)*)?)(\)?)(?=\s|$)/g, '$1<b>$2</b>$3')
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
  const chordRoots = textContent.match(/\b([A-G][#b]?)(?=\s|$|\s*[\/\(\)\d]|m(?!\w)|M|dim|aug|sus|add|Â°|7)/g)
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


function App() {
  const params = useParams()
  const navigate = useNavigate()
  const [autoScrollSpeed, setAutoScrollSpeed] = useState(1)
  const [isScrolling, setIsScrolling] = useState(false)
  const [fontSize, setFontSize] = useState(15)
  const [transposeOffset, setTransposeOffset] = useState(0)
  const [formaTom, setFormaTom] = useState(null)
  const [simplifyChords, setSimplifyChords] = useState(false)
  const [violinMode, setViolinMode] = useState(false)
  const [singerMode, setSingerMode] = useState(() => localStorage.getItem('singer-mode') === 'true')
  const [metronomeBpm, setMetronomeBpm] = useState(100)
  const [isMetronomePlaying, setIsMetronomePlaying] = useState(false)
  const padAudioRef = useRef(null)
  const [playingPadKey, setPlayingPadKey] = useState(null)
  const [selectedChord, setSelectedChord] = useState('')
  const [tomIsMinor, setTomIsMinor] = useState(false)
  const [chordQualityFlip, setChordQualityFlip] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editSongContent, setEditSongContent] = useState('')
  const [editSongName, setEditSongName] = useState('')

  const [songs, setSongs] = useState([])
  const [showAddModal, setShowAddModal] = useState(false)
  const [newSongName, setNewSongName] = useState('')
  const [newSongComposer, setNewSongComposer] = useState('')
  const [newSongFile, setNewSongFile] = useState(null)
  const [newSongFileGuitar, setNewSongFileGuitar] = useState(null)
  const [instrumentMode, setInstrumentMode] = useState('teclado')
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
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [pickerHue, setPickerHue] = useState(() => {
    const saved = localStorage.getItem('accent-color') || '#059669'
    const r = parseInt(saved.slice(1, 3), 16) / 255
    const g = parseInt(saved.slice(3, 5), 16) / 255
    const b = parseInt(saved.slice(5, 7), 16) / 255
    const max = Math.max(r, g, b), min = Math.min(r, g, b)
    if (max === min) return 0
    const d = max - min
    let h = 0
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6
    else if (max === g) h = ((b - r) / d + 2) / 6
    else h = ((r - g) / d + 4) / 6
    return Math.round(h * 360)
  })

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

  function handlePickerHueChange(e) {
    const h = Number(e.target.value)
    setPickerHue(h)
    const hex = hslToHex(h, 0.85, 0.55)
    document.documentElement.style.setProperty('--accent-color', hex)
  }

  function applyAccentColor() {
    const hex = getComputedStyle(document.documentElement).getPropertyValue('--accent-color').trim() || '#059669'
    localStorage.setItem('accent-color', hex)
    setShowColorPicker(false)
  }

  function resetAccentColor() {
    document.documentElement.style.setProperty('--accent-color', '#059669')
    localStorage.removeItem('accent-color')
    setShowColorPicker(false)
  }

  const scrollRef = useRef(null)
  const metronomeRef = useRef(null)
  const audioCtxRef = useRef(null)
  const searchRef = useRef(null)
  const fileInputRef = useRef(null)
  const fileInputGuitarRef = useRef(null)
  const userMenuRef = useRef(null)

  useEffect(() => {
    if (localStorage.getItem('theme') === 'dark') {
      document.documentElement.classList.add('dark')
    }
  }, [])

  useEffect(() => {
    if (showColorPicker) {
      const hex = getComputedStyle(document.documentElement).getPropertyValue('--accent-color').trim() || '#059669'
      setPickerHue(hexToHue(hex))
    }
  }, [])

  useEffect(() => {
    fetchSongs().then(data => {
      setSongs(data || [])
    })
  }, [])

  useEffect(() => {
    localStorage.setItem('singer-mode', singerMode)
  }, [singerMode])

  // Handle OAuth callback via deep link
  useEffect(() => {
    let unsub
    const isNative = window.Capacitor?.isNativePlatform?.()
    
    if (!isNative) return

    const handleAuthUrl = async (url) => {
      console.log('[Auth] Deep link received:', url)
      
      if (!url || !url.includes('auth/callback')) {
        console.log('[Auth] Ignoring non-auth URL:', url)
        return
      }

      try {
        const { Browser } = await import('@capacitor/browser')
        await Browser.close()
      } catch {}

      // Supabase will auto-detect and exchange code when URL has ?code=
      console.log('[Auth] Waiting for Supabase to detect session...')
      
      setTimeout(async () => {
        const { data: { session } } = await supabase.auth.getSession()
        console.log('[Auth] Session after timeout:', session ? 'active' : 'none')
        if (session?.user) {
          setUser(session.user)
        }
      }, 2000)
    }

    import('@capacitor/app').then(({ App }) => {
      console.log('[Auth] Initial URL:', window.location.href)
      handleAuthUrl(window.location.href)

      App.getLaunchUrl().then(({ url }) => {
        console.log('[Auth] Launch URL:', url)
        if (url) {
          handleAuthUrl(url)
        }
      })

      App.addListener('appUrlOpen', (event) => {
        console.log('[Auth] appUrlOpen event:', event.url)
        handleAuthUrl(event.url)
      }).then(listener => { unsub = listener })
    })
    return () => { unsub?.remove() }
  }, [])

  useEffect(() => {
    if (songs.length > 0 && params.songId) {
      const song = songs.find(s => s.id.toString() === params.songId)
      if (song) setSelectedSongId(song.id)
    }
    if (!currentPlaylist) {
      const storedPlaylist = sessionStorage.getItem('currentPlaylist')
      if (storedPlaylist) {
        setCurrentPlaylist(safeParseJson(storedPlaylist))
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
          const originalIsMinor = songKey.endsWith('m')
          const targetIsMinor = parsed.tom.endsWith('m')
          setChordQualityFlip(originalIsMinor !== targetIsMinor)
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

  const searchResults = useMemo(() => searchQuery.trim()
    ? songs.filter(s =>
        s.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [],
  [songs, searchQuery])

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
      setCurrentPlaylist(null)
      setCurrentPlaylistIndex(0)
      sessionStorage.removeItem('currentPlaylist')
      sessionStorage.removeItem('currentPlaylistIndex')
    }
    setFormaTom(null)
    setSimplifyChords(false)
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
    const speed = autoScrollSpeed * 0.35
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

  function togglePad(key) {
    if (playingPadKey === key) {
      if (padAudioRef.current) { padAudioRef.current.pause(); padAudioRef.current = null; }
      setPlayingPadKey(null);
      return;
    }
    if (padAudioRef.current) { padAudioRef.current.pause(); padAudioRef.current = null; }
    // Map display key (C#, D#, etc.) to file name (Cs, Ds, etc.)
    const fileKey = key.replace(/#/g, 's');
    const audio = new Audio('/Pads/' + encodeURIComponent(fileKey) + '.mp3');
    audio.volume = 0.6;
    audio.loop = true;
    audio.play().catch(() => {});
    padAudioRef.current = audio;
    setPlayingPadKey(key);
  }

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

  const openEditModal = () => {
    if (!currentSong) return
    setEditSongContent(currentSong.content || '')
    setEditSongName(currentSong.name || '')
    setShowEditModal(true)
  }

  const handleSaveEdit = async () => {
    if (!currentSong || !editSongContent.trim() || !editSongName.trim()) return
    const cleaned = editSongContent.replace(/\b__CHORD__\s*/g, '').trim()
    const key = detectKey(cleaned)
    const result = await updateSong(currentSong.id, {
      name: editSongName.trim(),
      content: cleaned,
      key,
      composer: currentSong.composer || '',
      youtube_url: currentSong.youtube_url || '',
    })
    if (result) {
      setSongs(prev => prev.map(s => s.id === currentSong.id ? { ...s, ...result } : s))
      setShowEditModal(false)
    } else {
      alert('Erro ao salvar. Verifique o console para mais detalhes.')
    }
  }

  const currentSong = selectedSongId
    ? songs.find(s => s.id === selectedSongId)
    : null

  const currentRawHtml = useMemo(() => {
    const baseContent = instrumentMode === 'violao' && currentSong?.content_guitar
      ? currentSong.content_guitar
      : currentSong?.content
    if (!baseContent) return ''
    const sanitized = sanitizeHtml(baseContent)
    return sanitized.includes('<b>') ? stripTomLine(sanitized) : convertPlainTextToHtml(stripTomLine(sanitized))
  }, [currentSong?.content, currentSong?.content_guitar, instrumentMode])
  const processedChordHtml = useMemo(() => processChordHtml(currentRawHtml, transposeOffset, simplifyChords, violinMode, chordQualityFlip, singerMode),
    [currentRawHtml, transposeOffset, simplifyChords, violinMode, chordQualityFlip, singerMode])
  const currentKey = useMemo(() => getKeyFromOffset(currentSong?.key || ORIGINAL_KEY, transposeOffset, chordQualityFlip ? !(currentSong?.key || ORIGINAL_KEY).endsWith('m') : (tomIsMinor || undefined)),
    [currentSong?.key, transposeOffset, chordQualityFlip, tomIsMinor])
  const currentFormaTom = useMemo(() => getFormaTomTransposed(formaTom, transposeOffset),
    [formaTom, transposeOffset])


  // When the key changes while pad is playing, switch the pad audio to the new key
  useEffect(() => {
    if (playingPadKey && playingPadKey !== currentKey) {
      const fileKey = currentKey.replace(/#/g, 's');
      const audio = new Audio('/Pads/' + encodeURIComponent(fileKey) + '.mp3');
      audio.volume = 0.6;
      audio.loop = true;
      audio.play().catch(() => {});
      if (padAudioRef.current) { padAudioRef.current.pause(); }
      padAudioRef.current = audio;
      setPlayingPadKey(currentKey);
    }
  }, [currentKey]);
  const sortedSongs = useMemo(() => [...songs].sort((a, b) => a.name.localeCompare(b.name, 'pt', { sensitivity: 'base' })),
    [songs])
  const filteredSongs = useMemo(() => songFilter.trim()
    ? sortedSongs.filter(s => s.name.toLowerCase().includes(songFilter.toLowerCase()))
    : sortedSongs,
  [sortedSongs, songFilter])

  const handleChordClick = (e) => {
    if (e.target.tagName === 'B') {
      setSelectedChord(e.target.textContent)
    }
  }

  return (
    <>
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
              showColorPicker={showColorPicker}
              setShowColorPicker={setShowColorPicker}
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
         showColorPicker={showColorPicker}
         setShowColorPicker={setShowColorPicker}
         instrumentMode={instrumentMode}
         setInstrumentMode={setInstrumentMode}
       />

      <main>

        {currentSong && (
        <div className="container cifra-page">
          <div className="cifra-header">
            <h1 className="cifra-title">{currentSong.name}</h1>
            <h2 className="cifra-artist">{currentSong.composer || ''}</h2>
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
                          window.scrollTo(0, 0)
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
                          window.scrollTo(0, 0)
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
                  <button className="tool-btn" onClick={() => setTransposeOffset(t => Math.max(-6, t - 1))} title="Diminuir tom">âˆ’</button>
                  <span className="tool-value">{currentKey}</span>
                  <button className="tool-btn" onClick={() => setTransposeOffset(t => Math.min(6, t + 1))} title="Aumentar tom">+</button>
                  <button className={`tool-btn tool-btn--quality${chordQualityFlip ? ' active' : ''}`} onClick={() => setChordQualityFlip(v => !v)} title="Alternar maior/menor">
                    <span style={{ fontFamily: 'serif', fontWeight: 700, fontSize: 13 }}>M</span>
                    <span style={{ fontSize: 10, opacity: 0.5 }}>/</span>
                    <span style={{ fontFamily: 'serif', fontWeight: 700, fontSize: 11 }}>m</span>
                  </button>
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
                <h3 className="sidebar-title">Instrumento</h3>
                <div className="tool-row" style={{ gap: '6px' }}>
                  <button
                    className={`tool-btn ${instrumentMode === 'teclado' ? 'active' : ''}`}
                    onClick={() => setInstrumentMode('teclado')}
                    style={{ fontSize: '12px', padding: '4px 10px' }}
                  >ðŸŽ¹ Teclado</button>
                  <button
                    className={`tool-btn ${instrumentMode === 'violao' ? 'active' : ''}`}
                    onClick={() => setInstrumentMode('violao')}
                    style={{ fontSize: '12px', padding: '4px 10px' }}
                  >ðŸŽ¸ ViolÃ£o</button>
                </div>
                <span className="tool-hint">{instrumentMode === 'violao' ? 'Cifra violÃ£o' : 'Cifra teclado'}</span>
              </div>

              <div className="sidebar-section">
                <h3 className="sidebar-title">Violino</h3>
                <label className="toggle-switch">
                  <input type="checkbox" checked={violinMode} onChange={(e) => setViolinMode(e.target.checked)} />
                  <span className="toggle-track"></span>
                </label>
                <span className="tool-hint">{violinMode ? 'TerÃ§a' : 'Desativado'}</span>
              </div>

              <div className="sidebar-section">
                <h3 className="sidebar-title">Cantor</h3>
                <label className="toggle-switch">
                  <input type="checkbox" checked={singerMode} onChange={(e) => setSingerMode(e.target.checked)} />
                  <span className="toggle-track"></span>
                </label>
                <span className="tool-hint">{singerMode ? 'Ocultar notas' : 'Mostrar notas'}</span>
              </div>

              <div className="sidebar-section">
                <h3 className="sidebar-title">Auto Rolagem</h3>
                <div className="tool-row">
                  <button
                    className={`tool-btn play-btn ${isScrolling ? 'active' : ''}`}
                    onClick={() => setIsScrolling(s => !s)}
                  >
                    {isScrolling ? 'â¸' : 'â–¶'}
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
                {isScrolling && <span className="tool-hint">EspaÃ§o para pausar</span>}
              </div>

              <div className="sidebar-section">
                <h3 className="sidebar-title">MetrÃ´nomo</h3>
                <div className="tool-row">
                  <button
                    className={`tool-btn play-btn ${isMetronomePlaying ? 'active' : ''}`}
                    onClick={() => setIsMetronomePlaying(s => !s)}
                  >
                    {isMetronomePlaying ? 'â¹' : 'â–¶'}
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

              {userIsAdmin && currentSong && (
                <div className="sidebar-section">
                  <h3 className="sidebar-title">Admin</h3>
                  <div className="tool-row" style={{ flexDirection: 'column', gap: 6, alignItems: 'stretch' }}>
                    <button className="tool-btn" style={{ width: '100%', borderRadius: 8, fontSize: 13, padding: '8px 12px' }} onClick={openEditModal}>
                      Alterar notas
                    </button>
                  </div>
                </div>
              )}
            </aside>

            <div className="cifra-col-left">
              <div className="cifra-content" style={{ fontSize: `${fontSize}px` }}>
                <div className="cifra-tom" style={{ position: 'relative', paddingTop: 44 }}>
                  tom: <a href="#" title="alterar o tom da cifra">{currentKey}</a>
                  {currentFormaTom && (
                    <span title="forma dos acordes"> (forma dos acordes no tom de {currentFormaTom})</span>
                  )}
                <button
                    onClick={() => togglePad(currentKey)}
                    style={{
                      position: 'absolute',
                      top: 2,
                      left: '50%',
                      transform: 'translateX(-50%)',
                      padding: '8px 28px',
                      fontSize: 15,
                      fontWeight: 700,
                      borderRadius: 24,
                      border: 'none',
                      background: playingPadKey === currentKey
                        ? 'linear-gradient(135deg, #e74c3c, #c0392b)'
                        : 'linear-gradient(135deg, #f39c12, #e67e22)',
                      color: '#fff',
                      cursor: 'pointer',
                      boxShadow: playingPadKey === currentKey
                        ? '0 4px 15px rgba(231,76,60,0.4)'
                        : '0 4px 15px rgba(243,156,18,0.4)',
                      transition: 'all 0.3s ease',
                      zIndex: 10,
                      letterSpacing: 0.5,
                    }}
                  >
                    Pad
                  </button>
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

              {userIsAdmin && currentSong && (
                <div style={{ marginTop: 16, borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 12 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', opacity: 0.5, marginBottom: 8 }}>Admin</div>
                  <button
                    className="mobile-tool-btn-small"
                    style={{ width: '100%', borderRadius: 8, fontSize: 13, padding: '8px 12px', display: 'flex', gap: 6 }}
                    onClick={openEditModal}
                  >
                    Alterar notas
                  </button>
                </div>
              )}
              </div>
            )}
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
              <label className="modal-label" style={{ marginTop: '10px' }}>Cifra ViolÃ£o (txt)</label>
              <div className="modal-file-area" onClick={() => fileInputGuitarRef.current?.click()}>
                {newSongFileGuitar ? (
                  <span className="modal-file-name">{newSongFileGuitar.name}</span>
                ) : (
                  <span className="modal-file-placeholder">Clique para selecionar arquivo .txt (violÃ£o)</span>
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

      {showEditModal && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal modal--wide" onClick={e => e.stopPropagation()} style={{ maxWidth: 700 }}>
            <h2 className="modal-title">Alterar notas</h2>
            <div className="modal-body">
              <label className="modal-label">Nome da mÃºsica</label>
              <input
                className="modal-input"
                value={editSongName}
                onChange={e => setEditSongName(e.target.value)}
                placeholder="Nome da mÃºsica"
              />
              <label className="modal-label" style={{ marginTop: 12 }}>ConteÃºdo da cifra</label>
              <ChordEditor
                content={editSongContent}
                onChange={setEditSongContent}
              />
            </div>
            <div className="modal-actions" style={{ justifyContent: 'flex-end' }}>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="modal-btn modal-btn-cancel" onClick={() => setShowEditModal(false)}>
                  Cancelar
                </button>
                <button className="modal-btn modal-btn-confirm" onClick={handleSaveEdit} disabled={!editSongName.trim() || !editSongContent.trim()}>
                  Salvar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showLoginModal && (
        <div className="modal-overlay" onClick={() => { setShowLoginModal(false); setShowEmailForm(false); setShowSignupForm(false) }}>
          <div className="modal modal-login" onClick={e => e.stopPropagation()}>
            {!showEmailForm ? (
              <>
                <div className="modal-login-icon">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="1.5"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
                </div>
                <h2 className="modal-title">Bem-vindo ao Cifras</h2>
                <p className="modal-login-desc">
                  Este site e exclusivo para os membros do louvor da <strong>Igreja Caminho da Restauracao</strong>.
                  Faca login com email/senha para acessar e gerenciar as cifras.
                </p>
                <button className="btn-signup" onClick={() => setShowEmailForm(true)}>
                  Entrar
                </button>
                <button className="btn-signup btn-signup-secondary" onClick={() => { setShowEmailForm(true); setShowSignupForm(true) }}>
                  Criar conta
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
                    onKeyDown={e => { if (e.key === 'Enter') document.getElementById('btn-criar').click() }}
                  />
                  {signupError && <p className="modal-error">{signupError}</p>}
                </div>
                <div className="modal-actions">
                  <button className="modal-btn modal-btn-cancel" onClick={() => { setShowSignupForm(false); setSignupError(''); setSignupEmail(''); setSignupPassword(''); setSignupName('') }}>Voltar</button>
                  <button
                    id="btn-criar"
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

              {userIsAdmin && currentSong && (
                <div className="mobile-panel-item" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 6, padding: '12px 0 0', borderTop: '1px solid rgba(255,255,255,0.1)', marginTop: 8 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', opacity: 0.5 }}>Admin</span>
                  <button className="mobile-tool-btn-small" style={{ width: '100%', borderRadius: 8, fontSize: 13, padding: '8px 12px' }} onClick={openEditModal}>
                    Alterar notas
                  </button>
                </div>
              )}
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
              {activeMobilePanel === 'ouvir' && 'Ouvir MÃºsica'}
              {activeMobilePanel === 'opcoes' && 'Mais OpÃ§Ãµes'}
            </h4>
            <button className="mobile-panel-close" onClick={() => setActiveMobilePanel(null)}>Ã—</button>
          </div>
          
          <div className="mobile-panel-body">
            {activeMobilePanel === 'tom' && (
              <div className="mobile-panel-content">
                <div className="mobile-tool-row">
                  <button className="mobile-tool-btn" onClick={() => setTransposeOffset(t => Math.max(-6, t - 1))}>âˆ’</button>
                  <span className="mobile-tool-value">{currentKey}</span>
                  <button className="mobile-tool-btn" onClick={() => setTransposeOffset(t => Math.min(6, t + 1))}>+</button>
                  <button className={`mobile-tool-btn${chordQualityFlip ? ' active' : ''}`} onClick={() => setChordQualityFlip(v => !v)} title="Alternar maior/menor" style={{ fontFamily: 'serif', fontWeight: 700, fontSize: 15 }}>
                    <span style={{ fontFamily: 'serif', fontWeight: 700, fontSize: 16 }}>M</span>
                    <span style={{ fontSize: 11, opacity: 0.5 }}>/</span>
                    <span style={{ fontFamily: 'serif', fontWeight: 700, fontSize: 14 }}>m</span>
                  </button>
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
                        Nenhum vÃ­deo disponÃ­vel
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
                  <span>Cantor</span>
                  <label className="toggle-switch">
                    <input type="checkbox" checked={singerMode} onChange={(e) => setSingerMode(e.target.checked)} />
                    <span className="toggle-track"></span>
                  </label>
                </div>

                <div className="mobile-panel-item">
                  <span>{instrumentMode === "teclado" ? "ðŸŽ¹" : "ðŸŽ¸"} {instrumentMode === "teclado" ? "Teclado" : "ViolÃ£o"}</span>
                  <label className="toggle-switch">
                    <input type="checkbox" checked={instrumentMode === "violao"} onChange={(e) => setInstrumentMode(e.target.checked ? "violao" : "teclado")} />
                    <span className="toggle-track"></span>
                  </label>
                </div>

                <div className="mobile-panel-item">
                  <span>MetrÃ´nomo ({metronomeBpm} BPM)</span>
                  <div className="mobile-tool-row-small">
                    <button className={`mobile-tool-btn-small ${isMetronomePlaying ? 'active' : ''}`} onClick={() => setIsMetronomePlaying(s => !s)}>
                      {isMetronomePlaying ? 'â¹' : 'â–¶'}
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
                  <span>Personalizar Cor</span>
                  <button
                    className="mobile-tool-btn-small"
                    onClick={() => setShowColorPicker(true)}
                    style={{ background: 'var(--accent-color)', width: 32, height: 32, borderRadius: 8, border: '2px solid var(--gray-border)' }}
                    title="Personalizar cor dos destaques"
                  />
                </div>


               {userIsAdmin && currentSong && (
                <div className="mobile-panel-item" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 6, padding: '12px 0 0', borderTop: '1px solid rgba(255,255,255,0.1)', marginTop: 8 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', opacity: 0.5 }}>Admin</span>
                  <button className="mobile-tool-btn-small" style={{ width: '100%', borderRadius: 8, fontSize: 13, padding: '8px 12px' }} onClick={() => { openEditModal(); setActiveMobilePanel(null) }}>
                    Alterar notas
                  </button>
                </div>
              )}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="mobile-bottom-bar" style={{ display: showEditModal ? 'none' : undefined }}>
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
          <span>OpÃ§Ãµes</span>
        </button>
      </div>
    </div>

      {showColorPicker && (
        <div className="color-picker-overlay" onClick={() => {
          const saved = localStorage.getItem('accent-color')
          document.documentElement.style.setProperty('--accent-color', saved || '#059669')
          setShowColorPicker(false)
        }}>
          <div className="color-picker-modal" onClick={e => e.stopPropagation()}>
            <div className="color-picker-header">
              <h3 className="color-picker-title">Personalizar cor</h3>
              <button className="color-picker-close" onClick={() => {
                const saved = localStorage.getItem('accent-color')
                document.documentElement.style.setProperty('--accent-color', saved || '#059669')
                setShowColorPicker(false)
              }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            <div className="color-picker-preview">
              <div className="color-picker-swatch" style={{ background: hslToHex(pickerHue, 0.85, 0.55) }} />
              <div>
                <div className="color-picker-hex">
                  {hslToHex(pickerHue, 0.85, 0.55)}
                </div>
                <div className="color-picker-label" style={{ marginBottom: 0 }}>Cor dos destaques</div>
              </div>
            </div>

            <label className="color-picker-label">Matiz</label>
            <input
              type="range"
              className="color-picker-slider"
              min="0"
              max="360"
              value={pickerHue}
              onChange={handlePickerHueChange}
            />

            <label className="color-picker-label">Sugestoes</label>
            <div className="color-picker-presets">
              {['#059669', '#f97316', '#ef4444', '#ec4899', '#a855f7', '#6366f1', '#3b82f6', '#06b6d4', '#14b8a6', '#84cc16'].map(c => (
                <button
                  key={c}
                  className={`color-picker-preset${hslToHex(pickerHue, 0.85, 0.55) === c ? ' active' : ''}`}
                  style={{ background: c }}
                  onClick={() => {
                    const hue = hexToHue(c)
                    handlePickerHueChange({ target: { value: hue } })
                  }}
                />
              ))}
            </div>

            <div className="color-picker-actions">
              <button className="color-picker-btn color-picker-btn-reset" onClick={resetAccentColor}>
                Restaurar padrao
              </button>
              <button className="color-picker-btn color-picker-btn-apply" onClick={applyAccentColor}>
                Aplicar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// Chord editor component for admin "Alterar notas"
const COMMON_CHORDS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B', 'Cm', 'C#m', 'Dm', 'D#m', 'Em', 'Fm', 'F#m', 'Gm', 'G#m', 'Am', 'A#m', 'Bm', 'C7', 'D7', 'E7', 'F7', 'G7', 'A7', 'B7', 'Cm7', 'Dm7', 'Gm7', 'Am7', 'Em7', 'Dm9', 'Am9', 'G9', 'CÂº', 'CÂ°', 'Cdim', 'Caug', 'C+', 'Csus4', 'Csus2', 'Cadd9']

function ChordEditor({ content, onChange }) {
  const lines = content.split('\n')

  const chordPattern = /^\(?[A-G][#b]?(?:m|M|maj|Maj|dim|aug|sus|add|Â°|Âº|\+|Ã¸|7M)?[0-9]*(?:sus[0-9]*|add[0-9]*|[b#][0-9]+|\+[0-9]*|aug|dim|Â°|Âº|-[0-9]*)*(?:\([^)]*\))*(?:\/[A-G][#b]?(?:m|M|maj|Maj|dim|aug|sus|add|Â°|Âº|\+|Ã¸|7M)?[0-9]*(?:sus[0-9]*|add[0-9]*|[b#][0-9]+|\+[0-9]*|aug|dim|Â°|Âº|-[0-9]*)*)*\)?$/
  const sectionPattern = /^\[.*\]$/

  function isChordLine(line) {
    const trimmed = line.trim()
    if (!trimmed) return false
    const tokens = trimmed.split(/\s+/)
    return tokens.every(t => chordPattern.test(t) || t === '__CHORD__' || /^\[.*\]$/.test(t) || /^\d+x?$|^[\|:]+$|^(?:Riff|Solo|Fine|Coda|D\.?[CS]\.?)$|[\[\]]/i.test(t))
  }

  function toggleChordAt(lineIdx, tokenIdx) {
    const newLines = [...lines]
    const tokens = newLines[lineIdx].trim().split(/\s+/)
    const existing = tokens[tokenIdx]
    if (existing && chordPattern.test(existing.trim())) {
      tokens.splice(tokenIdx, 1)
    } else {
      tokens.splice(tokenIdx, 0, '__CHORD__')
    }
    newLines[lineIdx] = tokens.join(' ')
    onChange(newLines.join('\n'))
  }

  function handleChordPick(lineIdx, tokenIdx, chord) {
    const newLines = [...lines]
    const tokens = newLines[lineIdx].trim().split(/\s+/)
    const existing = tokens[tokenIdx]
    if (existing && existing.trim() === '__CHORD__') {
      tokens[tokenIdx] = chord
    } else if (existing) {
      tokens[tokenIdx] = chord
    } else {
      tokens.splice(tokenIdx, 0, chord)
    }
    newLines[lineIdx] = tokens.join(' ')
    onChange(newLines.join('\n'))
  }

  function removeChordAt(lineIdx, tokenIdx) {
    const newLines = [...lines]
    const tokens = newLines[lineIdx].trim().split(/\s+/)
    tokens.splice(tokenIdx, 1)
    newLines[lineIdx] = tokens.join(' ')
    onChange(newLines.join('\n'))
  }

  // Build sections: pair chord lines with their following lyric lines
  const sections = []
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmed = line.trimEnd()
    if (!trimmed) {
      sections.push({ type: 'empty' })
      continue
    }
    if (sectionPattern.test(trimmed)) {
      sections.push({ type: 'section', text: trimmed })
      continue
    }
    if (isChordLine(line)) {
      const chordTokens = trimmed.split(/\s+/)
      const hasNext = i + 1 < lines.length
      const nextLine = hasNext ? lines[i + 1] : ''
      const nextTrimmed = nextLine.trimEnd()
      const nextIsChord = hasNext && nextTrimmed && isChordLine(nextLine)
      sections.push({ type: 'pair', chordTokens, lyricText: nextIsChord ? '' : nextTrimmed, chordLineIdx: i })
      if (hasNext && !nextIsChord) i++
      continue
    }
    sections.push({ type: 'lyric', text: trimmed, lineIdx: i })
  }

  const [pendingChord, setPendingChord] = useState(null)
  const [showPicker, setShowPicker] = useState(null)
  const [editingLyric, setEditingLyric] = useState(null)
  const [editLyricValue, setEditLyricValue] = useState('')

  return (
    <div className="chord-editor">
      <div className="chord-editor-lines">
        {sections.map((section, si) => {
          if (section.type === 'empty') {
            return <div key={si} style={{ height: 12 }} />
          }
          if (section.type === 'section') {
            return <div key={si} className="chord-editor-section-label">{section.text}</div>
          }
          if (section.type === 'lyric') {
            if (editingLyric === si) {
              return (
                <input
                  key={si}
                  className="chord-editor-lyric-input"
                  value={editLyricValue}
                  onChange={e => setEditLyricValue(e.target.value)}
                  onBlur={() => {
                    const newLines = content.split('\n')
                    newLines[section.lineIdx] = editLyricValue
                    onChange(newLines.join('\n'))
                    setEditingLyric(null)
                  }}
                  onKeyDown={e => {
                    if (e.key === 'Enter') e.target.blur()
                  }}
                  autoFocus
                />
              )
            }
            return (
              <div
                key={si}
                className="chord-editor-lyric"
                onClick={() => {
                  setEditingLyric(si)
                  setEditLyricValue(section.text)
                }}
              >{section.text}</div>
            )
          }
          if (section.type === 'pair') {
            return (
              <div key={si} className="chord-editor-pair">
                <div className="chord-editor-chord-row">
                  {section.chordTokens.map((token, ci) => {
                    const parenMatch = typeof token === 'string' && token !== '__CHORD__' ? token.match(/^(\(?)(.*?)(\)?)$/) : null
                    const parenPrefix = parenMatch && parenMatch[1] ? parenMatch[1] : ''
                    const parenSuffix = parenMatch && parenMatch[3] ? parenMatch[3] : ''
                    const cleanChord = parenMatch ? parenMatch[2] : token
                    const isChord = token === '__CHORD__' || chordPattern.test(cleanChord)
                    return (
                      <React.Fragment key={ci}>
                        {parenPrefix && <span className="chord-editor-paren">{parenPrefix}</span>}
                        {isChord ? (
                          <span
                            className={`chord-editor-chord${cleanChord === '__CHORD__' ? ' pending' : ''}`}
                            draggable={cleanChord !== '__CHORD__'}
                            onClick={() => {
                              setShowPicker({ si, ci, lineIdx: section.chordLineIdx, currentChord: cleanChord === '__CHORD__' ? null : cleanChord, parenPrefix, parenSuffix })
                            }}
                            onDragStart={(e) => {
                              if (cleanChord !== '__CHORD__') {
                                e.dataTransfer.setData('text/plain', JSON.stringify({ lineIdx: section.chordLineIdx, ci, chord: cleanChord, parenPrefix, parenSuffix }))
                              }
                            }}
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={(e) => {
                              e.preventDefault()
                              try {
                                const data = JSON.parse(e.dataTransfer.getData('text/plain'))
                                if (data.chord) {
                                  const oldLines = content.split('\n')
                                  const oldTokens = oldLines[data.lineIdx].trim().split(/\s+/)
                                  oldTokens[data.ci] = (data.parenPrefix || '') + data.chord + (data.parenSuffix || '')
                                  oldLines[data.lineIdx] = oldTokens.join(' ')
                                  const newTokens = oldLines[section.chordLineIdx].trim().split(/\s+/)
                                  newTokens[ci] = (data.parenPrefix || '') + data.chord + (data.parenSuffix || '')
                                  oldLines[section.chordLineIdx] = newTokens.join(' ')
                                  onChange(oldLines.join('\n'))
                                }
                              } catch {}
                            }}
                            title={cleanChord === '__CHORD__' ? 'Clique para escolher um acorde' : `Clique para alterar ou remover ${cleanChord}`}
                          >
                            {cleanChord === '__CHORD__' ? (
                              <span style={{ opacity: 0.3, fontSize: 11 }}>+</span>
                            ) : cleanChord}
                          </span>
                        ) : (
                          <span className="chord-editor-chord" style={{ cursor: 'default', opacity: 1 }}>
                            {cleanChord}
                          </span>
                        )}
                        {parenSuffix && <span className="chord-editor-paren">{parenSuffix}</span>}
                        {' '}
                      </React.Fragment>
                    )
                  })}
                  <span
                    className="chord-editor-add-trigger"
                    onClick={() => {
                      const newLines = [...content.split('\n')]
                      const tokens = newLines[section.chordLineIdx].trim().split(/\s+/)
                      tokens.push('__CHORD__')
                      newLines[section.chordLineIdx] = tokens.join(' ')
                      onChange(newLines.join('\n'))
                    }}
                  >
                    +
                  </span>
                </div>
                {editingLyric === si ? (
                  <input
                    className="chord-editor-lyric-input"
                    value={editLyricValue}
                    onChange={e => setEditLyricValue(e.target.value)}
                    onBlur={() => {
                      const newLines = content.split('\n')
                      newLines[section.chordLineIdx + 1] = editLyricValue
                      onChange(newLines.join('\n'))
                      setEditingLyric(null)
                    }}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.target.blur()
                      }
                    }}
                    autoFocus
                  />
                ) : (
                  <div
                    className="chord-editor-lyric"
                    onClick={() => {
                      setEditingLyric(si)
                      setEditLyricValue(section.lyricText)
                    }}
                  >{section.lyricText}</div>
                )}
              </div>
            )
          }
          return null
        })}
      </div>

      {showPicker && (
        <div className="chord-editor-picker-overlay" onClick={() => setShowPicker(null)}>
          <div className="chord-editor-picker" onClick={e => e.stopPropagation()}>
            <div className="chord-editor-picker-header">
              <strong>{showPicker?.currentChord ? `Alterar ${showPicker.currentChord}` : 'Escolha o acorde'}</strong>
              <button className="chord-editor-picker-close" onClick={() => setShowPicker(null)}>Ã—</button>
            </div>
            {showPicker?.currentChord && (
              <div style={{ marginBottom: 10 }}>
                <button
                  className="chord-editor-btn-remove"
                  onClick={() => {
                    const section = sections[showPicker.si]
                    if (section && section.type === 'pair') {
                      const targetChord = (showPicker.parenPrefix || '') + showPicker.currentChord + (showPicker.parenSuffix || '')
                      // Find the actual token index with parens stripped for matching
                      const tokens = content.split('\n')[section.chordLineIdx].trim().split(/\s+/)
                      const actualIdx = tokens.findIndex((t, i) => {
                        const m = t.match(/^(\(?)(.*?)(\)?)$/)
                        return m && m[2] === showPicker.currentChord
                      })
                      if (actualIdx >= 0) {
                        removeChordAt(section.chordLineIdx, actualIdx)
                      } else {
                        removeChordAt(section.chordLineIdx, showPicker.ci)
                      }
                    }
                    setShowPicker(null)
                  }}
                >
                  Remover {showPicker.currentChord}
                </button>
              </div>
            )}
            <div className="chord-editor-picker-grid">
              {COMMON_CHORDS.map(chord => (
                <button
                  key={chord}
                  className={`chord-editor-picker-btn${chord === showPicker?.currentChord ? ' selected' : ''}`}
                  onClick={() => {
                    const section = sections[showPicker.si]
                    if (section && section.type === 'pair') {
                      const wrappedChord = (showPicker.parenPrefix || '') + chord + (showPicker.parenSuffix || '')
                      handleChordPick(section.chordLineIdx, showPicker.ci, wrappedChord)
                    }
                    setShowPicker(null)
                  }}
                >
                  {chord}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App

