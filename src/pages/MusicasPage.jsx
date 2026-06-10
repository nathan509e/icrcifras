import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchSongs } from '../supabase'

export default function MusicasPage() {
  const [songs, setSongs] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    fetchSongs().then(data => {
      setSongs(data || [])
      setLoading(false)
    })
  }, [])

  const filteredSongs = songs.filter(song =>
    song.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleSongClick = (song) => {
    navigate('/cifra', { state: { song } })
  }

  if (loading) {
    return (
      <div className="musicas-page loading">
        <div className="container">
          <div className="loading-spinner">Carregando musicas...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="musicas-page">
      <div className="container">
        <header className="musicas-header">
          <h1>Louvores</h1>
          <p className="musicas-count">{songs.length} musicas disponiveis</p>
        </header>

        <div className="search-section">
          <input
            type="text"
            className="search-input"
            placeholder="Buscar musica..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            autoFocus
          />
        </div>

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
  )
}