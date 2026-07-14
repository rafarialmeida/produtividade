import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { ArrowLeft, Loader2, Lock, LogIn, Mail, Moon, Sun, User, UserPlus, Zap } from 'lucide-react'
import { useAppStore } from '../store/useStore'
import { useTheme } from '../hooks/useTheme'

type Mode = 'login' | 'signup'

export default function LoginPage() {
  const authUser = useAppStore((s) => s.authUser)
  const signIn = useAppStore((s) => s.signIn)
  const signUp = useAppStore((s) => s.signUp)
  const signInWithGoogle = useAppStore((s) => s.signInWithGoogle)
  const signInWithMicrosoft = useAppStore((s) => s.signInWithMicrosoft)
  const sendPasswordReset = useAppStore((s) => s.sendPasswordReset)

  const [mode, setMode] = useState<Mode>('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [confirmationMessage, setConfirmationMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [oauthLoading, setOauthLoading] = useState<'google' | 'microsoft' | null>(null)
  const { theme, toggleTheme } = useTheme()

  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotError, setForgotError] = useState('')
  const [forgotMessage, setForgotMessage] = useState('')
  const [forgotSubmitting, setForgotSubmitting] = useState(false)

  function openForgotPassword() {
    setForgotEmail(email)
    setForgotError('')
    setForgotMessage('')
    setShowForgotPassword(true)
  }

  async function handleForgotSubmit(e: React.FormEvent) {
    e.preventDefault()
    setForgotError('')
    setForgotMessage('')
    if (!forgotEmail.trim()) {
      setForgotError('Informe seu e-mail.')
      return
    }
    setForgotSubmitting(true)
    try {
      const resetError = await sendPasswordReset(forgotEmail.trim())
      if (resetError) setForgotError(resetError)
      else setForgotMessage('Se esse e-mail estiver cadastrado, você vai receber um link para redefinir a senha.')
    } finally {
      setForgotSubmitting(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setConfirmationMessage('')
    setSubmitting(true)
    try {
      if (mode === 'signup') {
        if (name.trim().length < 2) {
          setError('Informe seu nome.')
          return
        }
        const { error: signUpError, needsConfirmation } = await signUp(name.trim(), email.trim(), password)
        if (signUpError) {
          setError(signUpError)
          return
        }
        if (needsConfirmation) {
          setConfirmationMessage('Conta criada! Verifique seu e-mail para confirmar o cadastro antes de entrar.')
        }
      } else {
        const loginError = await signIn(email.trim(), password)
        if (loginError) setError(loginError)
      }
    } finally {
      setSubmitting(false)
    }
  }

  async function handleOAuth(provider: 'google' | 'microsoft') {
    setError('')
    setOauthLoading(provider)
    try {
      if (provider === 'google') await signInWithGoogle()
      else await signInWithMicrosoft()
    } finally {
      setOauthLoading(null)
    }
  }

  if (authUser) return <Navigate to="/day" replace />

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10 relative">
      <button
        onClick={toggleTheme}
        title={theme === 'dark' ? 'Ativar modo claro' : 'Ativar modo escuro'}
        className="absolute top-4 right-4 p-2 rounded-lg text-zinc-500 hover:text-white hover:bg-white/5 light:hover:text-zinc-900 light:hover:bg-black/5 transition-colors"
      >
        {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
      </button>
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-emerald-400 flex items-center justify-center shadow-[0_0_32px_rgba(168,85,247,0.55)] mb-4">
            <Zap size={26} className="text-black" strokeWidth={2.5} />
          </div>
          <h1 className="text-2xl font-bold text-white light:text-zinc-900 tracking-tight">Flawless</h1>
          <p className="text-zinc-500 text-sm mt-1 text-center">
            Execução estratégica. Sem desculpas. <span className="text-emerald-400 light:text-emerald-600">Sem procrastinação.</span>
          </p>
        </div>

        {showForgotPassword ? (
          <div className="glass-panel rounded-2xl p-6 sm:p-7 flex flex-col gap-5">
            <button
              type="button"
              onClick={() => setShowForgotPassword(false)}
              className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 light:hover:text-zinc-700 -mb-1 self-start"
            >
              <ArrowLeft size={13} /> Voltar para login
            </button>
            <div>
              <h2 className="text-base font-bold text-white light:text-zinc-900">Recuperar senha</h2>
              <p className="text-xs text-zinc-500 mt-1">
                Informe seu e-mail e enviaremos um link para você redefinir a senha.
              </p>
            </div>
            <form onSubmit={handleForgotSubmit} className="flex flex-col gap-4">
              <div>
                <label className="flex items-center gap-1.5 text-xs font-medium text-zinc-400 light:text-zinc-600 mb-1.5">
                  <Mail size={13} /> E-mail
                </label>
                <input
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  type="email"
                  placeholder="voce@exemplo.com"
                  className="input"
                />
              </div>

              {forgotError && <p className="text-xs text-rose-400 light:text-rose-600">{forgotError}</p>}
              {forgotMessage && <p className="text-xs text-emerald-400 light:text-emerald-600">{forgotMessage}</p>}

              <button type="submit" disabled={forgotSubmitting} className="btn-primary mt-1">
                {forgotSubmitting ? <Loader2 size={15} className="animate-spin" /> : <Mail size={15} />}
                Enviar link de recuperação
              </button>
            </form>
          </div>
        ) : (
          <>
            <div className="glass-panel rounded-2xl p-1.5 flex gap-1 mb-6">
              <TabButton active={mode === 'login'} onClick={() => { setMode('login'); setError(''); setConfirmationMessage('') }}>
                Entrar
              </TabButton>
              <TabButton active={mode === 'signup'} onClick={() => { setMode('signup'); setError(''); setConfirmationMessage('') }}>
                Criar conta
              </TabButton>
            </div>

            <div className="glass-panel rounded-2xl p-6 sm:p-7 flex flex-col gap-5">
              <div className="flex flex-col gap-2.5">
                <button
                  type="button"
                  onClick={() => handleOAuth('google')}
                  disabled={oauthLoading !== null}
                  className="flex items-center justify-center gap-2.5 rounded-xl border border-white/15 bg-white/[0.04] hover:bg-white/[0.08] text-sm font-medium text-white py-2.5 transition-colors disabled:opacity-50 light:border-black/15 light:bg-black/[0.02] light:hover:bg-black/[0.05] light:text-zinc-900"
                >
                  {oauthLoading === 'google' ? <Loader2 size={16} className="animate-spin" /> : <GoogleIcon />}
                  Continuar com Google
                </button>
                <button
                  type="button"
                  onClick={() => handleOAuth('microsoft')}
                  disabled={oauthLoading !== null}
                  className="flex items-center justify-center gap-2.5 rounded-xl border border-white/15 bg-white/[0.04] hover:bg-white/[0.08] text-sm font-medium text-white py-2.5 transition-colors disabled:opacity-50 light:border-black/15 light:bg-black/[0.02] light:hover:bg-black/[0.05] light:text-zinc-900"
                >
                  {oauthLoading === 'microsoft' ? <Loader2 size={16} className="animate-spin" /> : <MicrosoftIcon />}
                  Continuar com Microsoft
                </button>
              </div>

              <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-white/10 light:bg-black/10" />
                <span className="text-[11px] text-zinc-600">ou</span>
                <div className="h-px flex-1 bg-white/10 light:bg-black/10" />
              </div>

              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                {mode === 'signup' && (
                  <div>
                    <label className="flex items-center gap-1.5 text-xs font-medium text-zinc-400 light:text-zinc-600 mb-1.5">
                      <User size={13} /> Nome
                    </label>
                    <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Seu nome completo" className="input" />
                  </div>
                )}
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-medium text-zinc-400 light:text-zinc-600 mb-1.5">
                    <Mail size={13} /> E-mail
                  </label>
                  <input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    type="email"
                    placeholder="voce@exemplo.com"
                    className="input"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="flex items-center gap-1.5 text-xs font-medium text-zinc-400 light:text-zinc-600">
                      <Lock size={13} /> Senha
                    </label>
                    {mode === 'login' && (
                      <button
                        type="button"
                        onClick={openForgotPassword}
                        className="text-xs text-purple-300 light:text-purple-600 hover:text-purple-200 light:text-purple-600 light:hover:text-purple-700"
                      >
                        Esqueceu a senha?
                      </button>
                    )}
                  </div>
                  <input
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    type="password"
                    placeholder="••••••••"
                    minLength={6}
                    className="input"
                  />
                </div>

                {error && <p className="text-xs text-rose-400 light:text-rose-600">{error}</p>}
                {confirmationMessage && <p className="text-xs text-emerald-400 light:text-emerald-600">{confirmationMessage}</p>}

                <button type="submit" disabled={submitting} className="btn-primary mt-1">
                  {submitting ? (
                    <Loader2 size={15} className="animate-spin" />
                  ) : mode === 'signup' ? (
                    <UserPlus size={15} />
                  ) : (
                    <LogIn size={15} />
                  )}
                  {mode === 'signup' ? 'Criar conta' : 'Entrar'}
                </button>
              </form>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 flex items-center justify-center gap-1.5 text-sm font-medium py-2 rounded-xl transition-all ${
        active
          ? 'bg-white/10 text-white shadow-inner light:bg-black/[0.06] light:text-zinc-900'
          : 'text-zinc-500 hover:text-zinc-300 light:hover:text-zinc-700'
      }`}
    >
      {children}
    </button>
  )
}

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.5 6.1 29.5 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.4-.4-3.5z"/>
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 15.9 18.9 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.5 6.1 29.5 4 24 4 16.3 4 9.6 8.3 6.3 14.7z"/>
      <path fill="#4CAF50" d="M24 44c5.4 0 10.3-2.1 14-5.4l-6.5-5.5C29.3 34.7 26.8 36 24 36c-5.3 0-9.7-3.3-11.3-8.1l-6.5 5C9.5 39.6 16.2 44 24 44z"/>
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.3 5.7l6.5 5.5C39.9 37.6 44 31.7 44 24c0-1.2-.1-2.4-.4-3.5z"/>
    </svg>
  )
}

function MicrosoftIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 23 23" aria-hidden="true">
      <path fill="#f35325" d="M1 1h10v10H1z" />
      <path fill="#81bc06" d="M12 1h10v10H12z" />
      <path fill="#05a6f0" d="M1 12h10v10H1z" />
      <path fill="#ffba08" d="M12 12h10v10H12z" />
    </svg>
  )
}
