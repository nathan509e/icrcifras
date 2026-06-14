import { Link } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { useAuth } from '../AuthContext'
import { useState, useEffect, useRef } from 'react'
import { signInWithGoogle } from '../supabase'

export default function PrivacyPolicyPage() {
  const { user, userIsAdmin } = useAuth()
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [showEmailForm, setShowEmailForm] = useState(false)
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [loginLoading, setLoginLoading] = useState(false)
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
                    onKeyDown={e => { if (e.key === 'Enter') document.getElementById('btn-entrar-privacidade').click() }}
                  />
                  {loginError && <p className="modal-error">{loginError}</p>}
                </div>
                <div className="modal-actions">
                  <button className="modal-btn modal-btn-cancel" onClick={() => { setShowEmailForm(false); setLoginError('') }}>Voltar</button>
                  <button
                    id="btn-entrar-privacidade"
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
    </div>
  )
}