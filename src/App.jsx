import { useState, useRef, useEffect } from 'react'
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

  const scrollRef = useRef(null)
  const metronomeRef = useRef(null)
  const audioCtxRef = useRef(null)

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

  const processedChordHtml = processChordHtml(RAW_CHORD_HTML, transposeOffset, simplifyChords)
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
          <div className="search-wrapper">
            <form className="search-form" action="/">
              <label htmlFor="search" className="hidden-text">O que voce quer tocar hoje?</label>
              <input id="search" className="search-input" placeholder="O que voce quer tocar hoje?" autoComplete="off" />
              <button type="submit" className="search-btn" aria-label="Buscar"><span className="hidden-text">Buscar</span></button>
            </form>
          </div>
          <nav className="nav-links">
            <a href="#" className="nav-assine">Assine</a>
            <a href="#" className="nav-link">Listas</a>
            <a href="#" className="nav-link">Aprenda</a>
            <a href="#" className="nav-link">Enviar cifra</a>
            <a href="#" className="nav-link">Mais</a>
            <a href="#" className="nav-link">Entrar</a>
          </nav>
        </div>
      </header>

      <main>
        <div className="container breadcrumb">
          <ol>
            <li><a href="/">Pagina Inicial</a><span className="sep">&#9658;</span></li>
            <li><a href="/estilos/gospelreligioso/">Gospel/Religioso</a><span className="sep">&#9658;</span></li>
            <li><a href="/julliany-souza/">Julliany Souza</a><span className="sep">&#9658;</span></li>
            <li>Ah, Jesus / Coracao Igual Ao Teu</li>
          </ol>
        </div>

        <div className="container cifra-page">
          <div className="cifra-header">
            <h1 className="cifra-title">Ah, Jesus / Coracao Igual Ao Teu</h1>
            <h2 className="cifra-artist"><a href="/julliany-souza/">Julliany Souza</a></h2>
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
                    <iframe
                      src="https://www.youtube.com/embed/ldK43s9UyQI"
                      title="YouTube video player"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 'none' }}
                    />
                  </div>
                </div>
              </section>

            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

export default App
