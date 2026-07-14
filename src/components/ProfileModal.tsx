import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  Briefcase,
  Camera,
  Check,
  CheckCircle2,
  Crown,
  History,
  Lock,
  Loader2,
  Pencil,
  Star,
  Timer,
  Trash2,
  TrendingDown,
  TrendingUp,
  TriangleAlert,
  X,
} from 'lucide-react'
import { useAppStore } from '../store/useStore'
import type { PublicProfile } from '../types'
import { getLevelInfo } from '../utils/level'
import { formatDurationHours } from '../utils/date'
import TaskHistoryModal from './TaskHistoryModal'
import ImageCropperModal from './ImageCropperModal'

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
  const removeAvatar = useAppStore((s) => s.removeAvatar)
  const updatePassword = useAppStore((s) => s.updatePassword)
  const updateName = useAppStore((s) => s.updateName)

  const isOwn = authUser?.id === userId
  const [profile, setProfile] = useState<PublicProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [removing, setRemoving] = useState(false)
  const [cropSource, setCropSource] = useState<File | string | null>(null)
  const [avatarError, setAvatarError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordMsg, setPasswordMsg] = useState<{ text: string; ok: boolean } | null>(null)
  const [savingPassword, setSavingPassword] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [editingName, setEditingName] = useState(false)
  const [nameDraft, setNameDraft] = useState('')
  const [savingName, setSavingName] = useState(false)
  const [nameError, setNameError] = useState('')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setAvatarError('')
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

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setCropSource(file)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function handleCropConfirm(blob: Blob) {
    setUploading(true)
    setAvatarError('')
    const { url, error } = await uploadAvatar(blob)
    setUploading(false)
    setCropSource(null)
    if (error) setAvatarError(error)
    else if (url && profile) setProfile({ ...profile, avatarUrl: url })
  }

  async function handleRemoveAvatar() {
    if (!window.confirm('Excluir sua foto de perfil?')) return
    setRemoving(true)
    setAvatarError('')
    const error = await removeAvatar()
    setRemoving(false)
    if (error) setAvatarError(error)
    else if (profile) setProfile({ ...profile, avatarUrl: undefined })
  }

  function startEditingName() {
    if (!profile) return
    setNameDraft(profile.name)
    setNameError('')
    setEditingName(true)
  }

  async function handleSaveName() {
    if (!profile) return
    const trimmed = nameDraft.trim()
    if (!trimmed) {
      setNameError('Nome não pode ser vazio.')
      return
    }
    setSavingName(true)
    try {
      const error = await updateName(trimmed)
      if (error) {
        setNameError(error)
      } else {
        setNameError('')
        setProfile({ ...profile, name: trimmed })
        setEditingName(false)
      }
    } finally {
      setSavingName(false)
    }
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

  return createPortal(
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
                {isOwn && profile.avatarUrl && (
                  <button
                    onClick={() => setCropSource(profile.avatarUrl!)}
                    disabled={uploading}
                    title="Editar enquadramento"
                    className="absolute -bottom-1 -left-1 w-7 h-7 rounded-full bg-sky-600 hover:bg-sky-500 border-2 border-[#0d0e14] light:border-white flex items-center justify-center text-white disabled:opacity-60"
                  >
                    <Pencil size={11} />
                  </button>
                )}
                {isOwn && profile.avatarUrl && (
                  <button
                    onClick={handleRemoveAvatar}
                    disabled={removing}
                    title="Excluir foto"
                    className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-rose-600 hover:bg-rose-500 border-2 border-[#0d0e14] light:border-white flex items-center justify-center text-white disabled:opacity-60"
                  >
                    {removing ? <Loader2 size={10} className="animate-spin" /> : <Trash2 size={10} />}
                  </button>
                )}
                {isOwn && (
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                )}
              </div>
              <div className="min-w-0 flex-1">
                {editingName ? (
                  <div className="flex items-center gap-1.5">
                    <input
                      value={nameDraft}
                      onChange={(e) => setNameDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveName()
                        if (e.key === 'Escape') setEditingName(false)
                      }}
                      autoFocus
                      disabled={savingName}
                      maxLength={60}
                      className="input !py-1 !text-sm font-semibold"
                    />
                    <button
                      onClick={handleSaveName}
                      disabled={savingName}
                      title="Salvar"
                      className="p-1.5 rounded-lg text-emerald-400 hover:bg-emerald-500/10 transition-colors disabled:opacity-40 shrink-0"
                    >
                      <Check size={14} />
                    </button>
                    <button
                      onClick={() => setEditingName(false)}
                      disabled={savingName}
                      title="Cancelar"
                      className="p-1.5 rounded-lg text-zinc-500 hover:bg-white/5 transition-colors disabled:opacity-40 shrink-0"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <p className="font-semibold text-white light:text-zinc-900 truncate">{profile.name}</p>
                    {profile.role === 'admin' && <Crown size={13} className="text-amber-400 shrink-0" />}
                    {isOwn && (
                      <button
                        onClick={startEditingName}
                        title="Editar nome"
                        className="p-1 rounded text-zinc-600 hover:text-purple-300 hover:bg-purple-500/10 transition-colors shrink-0"
                      >
                        <Pencil size={12} />
                      </button>
                    )}
                  </div>
                )}
                {nameError && <p className="text-[11px] text-rose-400 mt-0.5">{nameError}</p>}
                <p className="text-xs text-zinc-500 mt-0.5">
                  {profile.communityCount} comunidade{profile.communityCount !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
            {avatarError && <p className="text-xs text-rose-400 -mt-3">{avatarError}</p>}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <LevelCard label="Nível de Trabalho" icon={Briefcase} xp={profile.workXp} accent="sky" />
              <LevelCard label="Nível de Tarefas Gerais" icon={Star} xp={profile.personalXp} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <StatBox icon={TrendingUp} color="emerald" label="Pontos positivos" value={profile.positivePoints} />
              <StatBox icon={TrendingDown} color="rose" label="Pontos perdidos" value={profile.lostPoints} prefix="-" />
              <StatBox icon={CheckCircle2} color="emerald" label="Tarefas concluídas" value={profile.tasksCompleted} />
              <StatBox icon={TriangleAlert} color="rose" label="Tarefas expiradas" value={profile.tasksExpired} />
              <StatBox icon={CheckCircle2} color="purple" label="Subtarefas concluídas" value={profile.subtasksCompleted} />
              <StatBox icon={TriangleAlert} color="purple" label="Subtarefas perdidas" value={profile.subtasksMissed} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 light:border-black/10 light:bg-black/[0.02]">
                <p className="flex items-center gap-1.5 text-[11px] font-medium text-zinc-500">
                  <Timer size={12} /> Lead time médio
                </p>
                <p className="text-lg font-bold text-white light:text-zinc-900 mt-1">{formatDurationHours(profile.leadTimeHours)}</p>
                <p className="text-[10px] text-zinc-500 mt-0.5">Da criação até a conclusão</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 light:border-black/10 light:bg-black/[0.02]">
                <p className="flex items-center gap-1.5 text-[11px] font-medium text-zinc-500">
                  <Timer size={12} /> Cycle time médio
                </p>
                <p className="text-lg font-bold text-white light:text-zinc-900 mt-1">{formatDurationHours(profile.cycleTimeHours)}</p>
                <p className="text-[10px] text-zinc-500 mt-0.5">Do início até a conclusão</p>
              </div>
            </div>

            {isOwn && (
              <button
                onClick={() => setShowHistory(true)}
                className="btn-ghost !w-auto self-start px-4 flex items-center gap-2"
              >
                <History size={14} /> Ver histórico
              </button>
            )}

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
      {showHistory && <TaskHistoryModal userId={userId} onClose={() => setShowHistory(false)} />}
      {cropSource && (
        <ImageCropperModal source={cropSource} onCancel={() => setCropSource(null)} onConfirm={handleCropConfirm} />
      )}
    </div>,
    document.body,
  )
}

function LevelCard({
  label,
  icon: Icon,
  xp,
  accent = 'purple',
}: {
  label: string
  icon: typeof Star
  xp: number
  accent?: 'purple' | 'sky'
}) {
  const info = getLevelInfo(xp)
  const positive = info.level >= 1
  const colors = positive
    ? accent === 'sky'
      ? { border: 'border-sky-500/30', bg: 'bg-sky-500/[0.06]', text: 'text-sky-300', bar: 'bg-sky-500' }
      : { border: 'border-purple-500/30', bg: 'bg-purple-500/[0.06]', text: 'text-purple-300', bar: 'bg-purple-500' }
    : { border: 'border-rose-500/30', bg: 'bg-rose-500/[0.06]', text: 'text-rose-400', bar: 'bg-rose-500' }
  return (
    <div className={`rounded-xl border p-4 ${colors.border} ${colors.bg}`}>
      <div className="flex items-center justify-between">
        <p className={`flex items-center gap-1.5 text-sm font-bold ${colors.text}`}>
          <Icon size={14} /> {label} · Nv {info.level}
        </p>
        <p className="text-xs text-zinc-400 light:text-zinc-600 tabular-nums">{xp} XP</p>
      </div>
      <div className="mt-2.5 h-1.5 rounded-full bg-white/5 light:bg-black/10 overflow-hidden">
        <div
          className={`h-full rounded-full ${colors.bar}`}
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
