import { Link } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { useAuth } from '../AuthContext'
import { useState, useEffect, useRef } from 'react'

export default function PrivacyPolicyPage() {
  const { user, userIsAdmin } = useAuth()
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [showSignupForm, setShowSignupForm] = useState(false)
  const [signupEmail, setSignupEmail] = useState('')
  const [signupPassword, setSignupPassword] = useState('')
  const [signupName, setSignupName] = useState('')
  const [signupError, setSignupError] = useState('')
  const [signupLoading, setSignupLoading] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const userMenuRef = useRef(null)
  const avatarUrl = user?.user_metadata?.avatar_url || user?.user_metadata?.picture || ''
  const displayName = user?.user_metadata?.full_name || user?.email || ''
  const avatarLetter = displayName ? displayName[0].toUpperCase() : '?'

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

  return (
    <div className="page-wrapper">
      <header className="header">
        <div className="container header-inner">
          <h1 className="header-logo"><Link to="/">Cifra Club</Link></h1>
          <Navbar
            user={user}
            userIsAdmin={userIsAdmin}
            showLoginModal={showLoginModal}
            setShowLoginModal={setShowLoginModal}
            userMenuRef={userMenuRef}
            showUserMenu={showUserMenu}
            setShowUserMenu={setShowUserMenu}
            avatarUrl={avatarUrl}
            displayName={displayName}
            avatarLetter={avatarLetter}
            isViewingSong={false}
            navigate={() => {}}
          />
        </div>
      </header>

      <main>
        <div className="container privacy-page">
          <div className="privacy-content">
            <h1 className="privacy-title">Politica de Privacidade</h1>
            <p className="privacy-updated">Ultima atualizacao: Junho de 2026</p>

            <section className="privacy-section">
              <h2>1. Introducao</h2>
              <p>
                Bem-vindo ao Cifras. Esta Politica de Privacidade descreve como coletamos, usamos e protegemos suas informacoes pessoais quando voce usa nosso aplicativo web.
              </p>
            </section>

            <section className="privacy-section">
              <h2>2. Dados que Coletamos</h2>
              <h3>2.1 Dados de Autenticacao</h3>
              <p>
                Utilizamos autenticacao via Google para permitir acesso exclusivo aos membros do louvor da Igreja Caminho da Restauracao. Coletamos:
              </p>
              <ul>
                <li>Nome</li>
                <li>Endereco de email</li>
                <li>Foto de perfil (opcional)</li>
              </ul>

              <h3>2.2 Dados de Uso</h3>
              <p>
                Armazenamos localmente no seu navegador:
              </p>
              <ul>
                <li>Preferencias de tema (claro/escuro)</li>
                <li>Configuracoes de cifra (tom, fonte, etc.)</li>
                <li>Listas de musicas salvas</li>
              </ul>
            </section>

            <section className="privacy-section">
              <h2>3. Como Usamos Seus Dados</h2>
              <p>Seus dados sao utilizados para:</p>
              <ul>
                <li>Autenticar seu acesso ao aplicativo</li>
                <li>Gerenciar suas listas de musicas favoritas</li>
                <li>Permitir sugestao de novos louvores</li>
                <li>Personalizar sua experiencia</li>
              </ul>
            </section>

            <section className="privacy-section">
              <h2>4. Armazenamento e Seguranca</h2>
              <p>
                Os dados sao armazenados em servidores da Supabase (AWS) com medidas de seguranca apropriadas. Dados locais no navegador sao criptografados quando possivel.
              </p>
              <p>
                Implementamos medidas de seguranca para proteger suas informacoes contra acesso nao autorizado, alteracao, divulgacao ou destruicao.
              </p>
            </section>

            <section className="privacy-section">
              <h2>5. Compartilhamento de Dados</h2>
              <p>
                Nao compartilhamos suas informacoes pessoais com terceiros, exceto:
              </p>
              <ul>
                <li>Com a Igreja Caminho da Restauracao (para verificacao de membro)</li>
                <li>Quando exigido por lei</li>
              </ul>
            </section>

            <section className="privacy-section">
              <h2>6. Seus Direitos</h2>
              <p>Você tem o direito de:</p>
              <ul>
                <li>Acessar seus dados pessoais</li>
                <li>Corrigir dados incorretos</li>
                <li>Solicitar exclusao dos seus dados</li>
                <li>Revogar o consentimento a qualquer momento</li>
              </ul>
              <p>
                Para exercer esses direitos, entre em contato atraves do email da Igreja.
              </p>
            </section>

            <section className="privacy-section">
              <h2>7. Cookies e Tecnologias Similar</h2>
              <p>
                Utilizamos cookies tecnicos necessarios para o funcionamento do aplicativo. Nao utilizamos cookies de terceiros para rastreamento ou propaganda.
              </p>
            </section>

            <section className="privacy-section">
              <h2>8. Criancas</h2>
              <p>
                Este aplicativo nao e direcionado a criancas menores de 13 anos. Nao coletamos intencionalmente informacoes de criancas.
              </p>
            </section>

            <section className="privacy-section">
              <h2>9. Alteracoes nesta Politica</h2>
              <p>
                Podemos atualizar esta Politica de Privacidade periodicamente. Notificaremos sobrealteracoes significativas atraves do aplicativo.
              </p>
            </section>

            <section className="privacy-section">
              <h2>10. Contato</h2>
              <p>
                Se tiver Duvidas sobre esta Politica de Privacidade, entre em contato com os administradores do aplicativo atraves da Igreja Caminho da Restauracao.
              </p>
            </section>

            <div className="privacy-back">
              <Link to="/" className="btn-voltar">Voltar para a pagina inicial</Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}