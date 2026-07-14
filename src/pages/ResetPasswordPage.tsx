import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, Loader2, Lock, Zap } from 'lucide-react'
import { useAppStore } from '../store/useStore'

export default function ResetPasswordPage() {
  const authUser = useAppStore((s) => s.authUser)
  const authLoading = useAppStore((s) => s.authLoading)
  const updatePassword = useAppStore((s) => s.updatePassword)
  const navigate = useNavigate()

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (newPassword.length < 6) {
      setError('A senha precisa ter pelo menos 6 caracteres.')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('As senhas não coincidem.')
      return
    }
    setSubmitting(true)
    try {
      const updateError = await updatePassword(newPassword)
      if (updateError) setError(updateError)
      else setDone(true)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-emerald-400 flex items-center justify-center shadow-[0_0_32px_rgba(168,85,247,0.55)] mb-4">
            <Zap size={26} className="text-black" strokeWidth={2.5} />
          </div>
          <h1 className="text-2xl font-bold text-white light:text-zinc-900 tracking-tight">Flawless</h1>
        </div>

        <div className="glass-panel rounded-2xl p-6 sm:p-7 flex flex-col gap-5">
          {done ? (
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <div className="w-11 h-11 rounded-full bg-emerald-500/15 flex items-center justify-center text-emerald-400 light:text-emerald-600">
                <Check size={20} />
              </div>
              <p className="text-sm text-zinc-300 light:text-zinc-700">Senha redefinida com sucesso!</p>
              <button onClick={() => navigate('/day')} className="btn-primary mt-1 !w-auto px-6">
                Ir para o app
              </button>
            </div>
          ) : authLoading ? (
            <div className="flex items-center justify-center py-6 text-zinc-500">
              <Loader2 size={20} className="animate-spin" />
            </div>
          ) : !authUser ? (
            <p className="text-sm text-rose-400 light:text-rose-600 text-center py-4">
              Link de redefinição inválido ou expirado. Solicite um novo link na tela de login.
            </p>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <p className="text-sm text-zinc-400 light:text-zinc-600">Escolha uma nova senha para sua conta.</p>
              <div>
                <label className="flex items-center gap-1.5 text-xs font-medium text-zinc-400 light:text-zinc-600 mb-1.5">
                  <Lock size={13} /> Nova senha
                </label>
                <input
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  type="password"
                  placeholder="••••••••"
                  minLength={6}
                  className="input"
                />
              </div>
              <div>
                <label className="flex items-center gap-1.5 text-xs font-medium text-zinc-400 light:text-zinc-600 mb-1.5">
                  <Lock size={13} /> Confirmar nova senha
                </label>
                <input
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  type="password"
                  placeholder="••••••••"
                  minLength={6}
                  className="input"
                />
              </div>

              {error && <p className="text-xs text-rose-400 light:text-rose-600">{error}</p>}

              <button type="submit" disabled={submitting} className="btn-primary mt-1">
                {submitting ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
                Redefinir senha
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
