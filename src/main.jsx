import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import './index.css'
import MusicasPage from './pages/MusicasPage'
import CifraPage from './pages/CifraPage'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/musicas" replace />} />
        <Route path="/musicas" element={<MusicasPage />} />
        <Route path="/cifra" element={<CifraPage />} />
        <Route path="*" element={<Navigate to="/musicas" replace />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
