import { useState, useEffect, useRef } from 'react'
import { useLocation, Link } from 'react-router-dom'

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

function stripTomLine(text) {
  return text.replace(/^[Tt]om\s*:\s*[A-G][#b]?\s*\n?/m, '')
}

const ORIGINAL_KEY = 'G'

export default function CifraPage() {
  const location = useLocation()
  const [autoScrollSpeed, setAutoScrollSpeed] = useState(5)
  const [isScrolling, setIsScrolling] = useState(false)
  const [fontSize, setFontSize] = useState(15)
  const [transposeOffset, setTransposeOffset] = useState(0)
  const [simplifyChords, setSimplifyChords] = useState(false)
  const [capo, setCapo] = useState(0)
  const [tuning, setTuning] = useState('standard')
  const [metronomeBpm, setMetronomeBpm] = useState(100)
  const [isMetronomePlaying, setIsMetronomePlaying] = useState(false)
  const [selectedChord, setSelectedChord] = useState('')

  const scrollRef = useRef(null)
  const metronomeRef = useRef(null)
  const audioCtxRef = useRef(null)

  const song = location.state?.song

  const currentRawHtml = song
    ? (song.content.includes('<b>') ? stripTomLine(song.content) : convertPlainTextToHtml(stripTomLine(song.content)))
    : ''
  const processedChordHtml = processChordHtml(currentRawHtml, transposeOffset, simplifyChords)
  const currentKey = getKeyFromOffset(song?.key || ORIGINAL_KEY, transposeOffset)

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
    return () => clearInterval(metronomeRef.current)
  }, [isMetronomePlaying, metronomeBpm])

  const handleChordClick = (e) => {
    if (e.target.tagName === 'B') {
      setSelectedChord(e.target.textContent)
    }
  }

  if (!song) {
    return (
      <div className="cifra-page">
        <div className="container">
          <div className="empty-state">
            <p>Nenhuma musica selecionada</p>
            <Link to="/musicas" className="btn-primary">Ver lista de musicas</Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="cifra-page">
      <div className="container">
        <div className="cifra-header">
          <Link to="/musicas" className="back-link">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
            Voltar
          </Link>
          <h1 className="cifra-title">{song.name}</h1>
          {song.composer && <h2 className="cifra-artist">{song.composer}</h2>}
          <div className="cifra-meta">
            <span className="version-badge">
              <span className="check"></span>
              Cifra: Principal
            </span>
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
              {transposeOffset !== 0 && <span className="tool-hint">({transposeOffset > 0 ? '+' : ''}{transposeOffset} semitons)</span>}
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
              {capo > 0 && <span className="tool-hint">Tom real: {getKeyFromOffset(song?.key || ORIGINAL_KEY, transposeOffset - capo)}</span>}
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
                tom: <span>{currentKey}</span>
              </div>
              <pre onClick={handleChordClick} dangerouslySetInnerHTML={{ __html: processedChordHtml }} />
            </div>

            {song.composer && (
              <div className="cifra-footer">
                <p>Composicao de {song.composer}</p>
              </div>
            )}
          </div>

          <div className="cifra-col-right">
            {song.youtube_url && (
              <section className="player-section">
                <div className="player-video">
                  <div className="player-embed">
                    {(() => {
                      const videoId = getYoutubeId(song.youtube_url)
                      return videoId ? (
                        <iframe
                          src={`https://www.youtube.com/embed/${videoId}`}
                          title="YouTube video player"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 'none' }}
                        />
                      ) : null
                    })()}
                  </div>
                </div>
              </section>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}