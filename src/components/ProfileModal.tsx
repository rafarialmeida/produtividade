import { useEffect, useRef, useState } from 'react'
import {
  Camera,
  CheckCircle2,
  Crown,
  Lock,
  Loader2,
  Star,
  TrendingDown,
  TrendingUp,
  TriangleAlert,
  X,
} from 'lucide-react'
import { useAppStore } from '../store/useStore'
import type { PublicProfile } from '../types'
import { getLevelInfo } from '../utils/level'

function Avatar({ profile, size = 80 }: { profile: PublicProfile; size?: number }) {
  if (profile.avatarUrl) {
    return (
      <img
        src={profile.avatarUrl}
        alt={profile.name}
        style={{ width: size, height: size }}
        className="rounded-full object-cover border border-white/10"
      />
    )
  }
  return (
    <div
      style={{ width: size, height: size }}
      className="rounded-full bg-gradient-to-br from-purple-600/40 to-emerald-500/40 border border-white/10 flex items-center justify-center font-bold text-white"
    >
      <span style={{ fontSize: size * 0.36 }}>{profile.name.slice(0, 1).toUpperCase()}</span>
    </div>
  )
}

export default function ProfileModal({ userId, onClose }: { userId: string; onClose: () => void }) {
  const authUser = useAppStore((s) => s.authUser)
  const fetchPublicProfile = useAppStore((s) => s.fetchPublicProfile)
  const uploadAvatar = useAppStore((s) => s.uploadAvatar)
  const updatePassword = useAppStore((s) => s.updatePassword)

  const isOwn = authUser?.id === userId
  const [profile, setProfile] = useState<PublicProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordMsg, setPasswordMsg] = useState<{ text: string; ok: boolean } | null>(null)
  const [savingPassword, setSavingPassword] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetchPublicProfile(userId).then((p) => {
      if (!cancelled) {
        setProfile(p)
        setLoading(false)
      }
    })
    return () => {
      cancelled = true
    }
  }, [userId, fetchPublicProfile])

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    const url = await uploadAvatar(file)
    setUploading(false)
    if (url && profile) setProfile({ ...profile, avatarUrl: url })
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault()
    setPasswordMsg(null)
    if (newPassword.length < 6) {
      setPasswordMsg({ text: 'A senha precisa ter pelo menos 6 caracteres.', ok: false })
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordMsg({ text: 'As senhas não coincidem.', ok: false })
      return
    }
    setSavingPassword(true)
    const error = await updatePassword(newPassword)
    setSavingPassword(false)
    if (error) {
      setPasswordMsg({ text: error, ok: false })
    } else {
      setPasswordMsg({ text: 'Senha atualizada!', ok: true })
      setNewPassword('')
      setConfirmPassword('')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-4 overflow-y-auto bg-black/70 backdrop-blur-sm">
      <div className="glass-panel neon-border-purple rounded-2xl w-full max-w-md my-8">
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/5">
          <h2 className="text-lg font-bold text-white light:text-zinc-900">Perfil</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-white/10 light:hover:text-zinc-900 light:hover:bg-black/10">
            <X size={18} />
          </button>
        </div>

        {loading || !profile ? (
          <div className="px-6 py-14 flex items-center justify-center text-zinc-500">
            <Loader2 size={20} className="animate-spin" />
          </div>
        ) : (
          <div className="px-6 py-5 flex flex-col gap-6">
            <div className="flex items-center gap-4">
              <div className="relative shrink-0">
                <Avatar profile={profile} />
                {isOwn && (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    title="Trocar foto"
                    className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-purple-600 hover:bg-purple-500 border-2 border-[#0d0e14] light:border-white flex items-center justify-center text-white disabled:opacity-60"
                  >
                    {uploading ? <Loader2 size={12} className="animate-spin" /> : <Camera size={12} />}
                  </button>
                )}
                {isOwn && (
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                )}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="font-semibold text-white light:text-zinc-900 truncate">{profile.name}</p>
                  {profile.role === 'admin' && <Crown size={13} className="text-amber-400 shrink-0" />}
                </div>
                <p className="text-xs text-zinc-500 mt-0.5">
                  {profile.communityCount} comunidade{profile.communityCount !== 1 ? 's' : ''}
                </p>
              </div>
            </div>

            <LevelCard xp={profile.xp} />

            <div className="grid grid-cols-2 gap-3">
              <StatBox icon={TrendingUp} color="emerald" label="Pontos positivos" value={profile.positivePoints} />
              <StatBox icon={TrendingDown} color="rose" label="Pontos perdidos" value={profile.lostPoints} prefix="-" />
              <StatBox icon={CheckCircle2} color="emerald" label="Tarefas concluídas" value={profile.tasksCompleted} />
              <StatBox icon={TriangleAlert} color="rose" label="Tarefas expiradas" value={profile.tasksExpired} />
              <StatBox icon={CheckCircle2} color="purple" label="Subtarefas concluídas" value={profile.subtasksCompleted} />
              <StatBox icon={TriangleAlert} color="purple" label="Subtarefas perdidas" value={profile.subtasksMissed} />
            </div>

            {isOwn && (
              <form onSubmit={handlePasswordSubmit} className="border-t border-white/5 pt-5 flex flex-col gap-3">
                <p className="flex items-center gap-1.5 text-xs font-medium text-zinc-400 light:text-zinc-600">
                  <Lock size={12} /> Trocar senha
                </p>
                <input
                  type="password"
                  placeholder="Nova senha"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="input"
                />
                <input
                  type="password"
                  placeholder="Confirmar nova senha"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="input"
                />
                {passwordMsg && (
                  <p className={`text-xs ${passwordMsg.ok ? 'text-emerald-400' : 'text-rose-400'}`}>{passwordMsg.text}</p>
                )}
                <button type="submit" disabled={savingPassword} className="btn-secondary !w-auto self-start px-4 disabled:opacity-50">
                  {savingPassword ? <Loader2 size={14} className="animate-spin" /> : 'Salvar nova senha'}
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function LevelCard({ xp }: { xp: number }) {
  const info = getLevelInfo(xp)
  const positive = info.level >= 1
  return (
    <div className={`rounded-xl border p-4 ${positive ? 'border-purple-500/30 bg-purple-500/[0.06]' : 'border-rose-500/30 bg-rose-500/[0.06]'}`}>
      <div className="flex items-center justify-between">
        <p className={`flex items-center gap-1.5 text-sm font-bold ${positive ? 'text-purple-300' : 'text-rose-400'}`}>
          <Star size={14} /> Nível {info.level}
        </p>
        <p className="text-xs text-zinc-400 light:text-zinc-600 tabular-nums">{xp} XP</p>
      </div>
      <div className="mt-2.5 h-1.5 rounded-full bg-white/5 overflow-hidden">
        <div
          className={`h-full rounded-full ${positive ? 'bg-purple-500' : 'bg-rose-500'}`}
          style={{ width: `${Math.min(100, Math.max(0, info.progress * 100))}%` }}
        />
      </div>
      <p className="text-[11px] text-zinc-500 mt-1.5">
        {positive
          ? `${info.xpToNextLevel} XP para o nível ${info.level + 1}`
          : `${info.xpToNextLevel} XP para cair pro nível ${info.level - 1}`}
      </p>
    </div>
  )
}

function StatBox({
  icon: Icon,
  color,
  label,
  value,
  prefix = '',
}: {
  icon: typeof TrendingUp
  color: 'emerald' | 'rose' | 'purple'
  label: string
  value: number
  prefix?: string
}) {
  const colors = { emerald: 'text-emerald-300', rose: 'text-rose-400', purple: 'text-purple-300' }
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 light:border-black/10 light:bg-black/[0.02]">
      <p className={`flex items-center gap-1.5 text-lg font-bold tabular-nums ${colors[color]}`}>
        <Icon size={14} />
        {prefix}
        {value}
      </p>
      <p className="text-[11px] text-zinc-500 mt-0.5">{label}</p>
    </div>
  )
}
