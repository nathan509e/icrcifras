import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import MusicasPage from './pages/MusicasPage'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/musicas" replace />} />
        <Route path="/musicas" element={<MusicasPage />} />
        <Route path="/:songId" element={<App />} />
        <Route path="*" element={<Navigate to="/musicas" replace />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
