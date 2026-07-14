import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Check, Copy, Crown, RefreshCcw, ShieldMinus, ShieldPlus, UserCheck, UserPlus, UserX, X } from 'lucide-react'
import { useAppStore } from '../store/useStore'
import type { CommunityJoinRequest } from '../types'
import OnlineDot from './OnlineDot'
import ProfileModal from './ProfileModal'
import { formatDisplayName } from '../utils/name'

export default function InviteModal({ communityId, onClose }: { communityId: string; onClose: () => void }) {
  const authUser = useAppStore((s) => s.authUser)
  const community = useAppStore((s) => s.getCommunityById(communityId))
  const users = useAppStore((s) => s.users)
  const onlineUserIds = useAppStore((s) => s.onlineUserIds)
  const regenerateInviteCode = useAppStore((s) => s.regenerateInviteCode)
  const setCommunityAdmin = useAppStore((s) => s.setCommunityAdmin)
  const fetchJoinRequests = useAppStore((s) => s.fetchJoinRequests)
  const approveJoinRequest = useAppStore((s) => s.approveJoinRequest)
  const rejectJoinRequest = useAppStore((s) => s.rejectJoinRequest)

  const [copied, setCopied] = useState(false)
  const [regenerating, setRegenerating] = useState(false)
  const [openProfileId, setOpenProfileId] = useState<string | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [roleError, setRoleError] = useState('')
  const [joinRequests, setJoinRequests] = useState<CommunityJoinRequest[]>([])
  const [resolvingId, setResolvingId] = useState<string | null>(null)
  const [requestError, setRequestError] = useState('')

  const canManageRoles = Boolean(
    authUser && community && (authUser.role === 'admin' || community.adminIds.includes(authUser.id)),
  )

  useEffect(() => {
    if (!canManageRoles) return
    let cancelled = false
    fetchJoinRequests(communityId).then((rows) => {
      if (!cancelled) setJoinRequests(rows)
    })
    return () => {
      cancelled = true
    }
  }, [communityId, canManageRoles, fetchJoinRequests])

  if (!community) return null

  const members = community.memberIds.map((id) => users.find((u) => u.id === id)).filter(Boolean)

  async function handleToggleAdmin(memberId: string, makeAdmin: boolean) {
    setRoleError('')
    setTogglingId(memberId)
    try {
      const error = await setCommunityAdmin(communityId, memberId, makeAdmin)
      if (error) setRoleError(error === 'LAST_ADMIN' ? 'Precisa ter pelo menos um admin na comunidade.' : error)
    } finally {
      setTogglingId(null)
    }
  }

  async function handleResolveRequest(requestId: string, approve: boolean) {
    setRequestError('')
    setResolvingId(requestId)
    try {
      const error = approve ? await approveJoinRequest(requestId) : await rejectJoinRequest(requestId)
      if (error) {
        setRequestError(error)
        return
      }
      setJoinRequests((prev) => prev.filter((r) => r.id !== requestId))
    } finally {
      setResolvingId(null)
    }
  }

  function handleCopy() {
    navigator.clipboard?.writeText(community!.inviteCode).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  async function handleRegenerate() {
    setRegenerating(true)
    try {
      await regenerateInviteCode(communityId)
    } finally {
      setRegenerating(false)
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-4 overflow-y-auto bg-black/70 backdrop-blur-sm">
      <div className="glass-panel neon-border-green rounded-2xl w-full max-w-md my-8">
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/5">
          <div className="flex items-center gap-2.5">
            <UserPlus size={18} className="text-emerald-300" />
            <h2 className="text-lg font-bold text-white light:text-zinc-900">Convidar Membros</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-white/10 light:hover:text-zinc-900 light:hover:bg-black/10">
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-5 flex flex-col gap-5">
          <div>
            <label className="text-xs font-medium text-zinc-400 light:text-zinc-600 mb-1.5 block">Código de convite</label>
            <div className="flex items-center gap-2">
              <div className="input font-mono tracking-[0.3em] text-center text-emerald-300 !w-auto flex-1">
                {community.inviteCode}
              </div>
              <button onClick={handleCopy} className="btn-ghost !w-auto px-3" title="Copiar código">
                {copied ? <Check size={15} className="text-emerald-400" /> : <Copy size={15} />}
              </button>
              <button
                onClick={handleRegenerate}
                disabled={regenerating}
                className="btn-ghost !w-auto px-3 disabled:opacity-50"
                title="Gerar novo código"
              >
                <RefreshCcw size={15} className={regenerating ? 'animate-spin' : ''} />
              </button>
            </div>
            <p className="text-[11px] text-zinc-500 mt-1.5">
              Compartilhe este código — a pessoa cria a conta (ou já tem uma) e pede para entrar pela aba "Comunidades". Um
              admin precisa aprovar antes de ela virar membro.
            </p>
          </div>

          {canManageRoles && joinRequests.length > 0 && (
            <div className="border-t border-white/5 pt-5">
              <p className="text-xs font-medium text-zinc-400 light:text-zinc-600 mb-2">
                Pedidos pendentes ({joinRequests.length})
              </p>
              {requestError && <p className="text-[11px] text-rose-400 mb-2">{requestError}</p>}
              <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto pr-1">
                {joinRequests.map((r) => {
                  const requester = users.find((u) => u.id === r.userId)
                  if (!requester) return null
                  return (
                    <div
                      key={r.id}
                      className="flex items-center gap-2.5 py-1.5 rounded-lg -mx-1.5 px-1.5 bg-amber-500/[0.05] border border-amber-500/15"
                    >
                      <button onClick={() => setOpenProfileId(requester.id)} className="flex items-center gap-2.5 text-left flex-1 min-w-0">
                        {requester.avatarUrl ? (
                          <img src={requester.avatarUrl} alt={requester.name} className="w-7 h-7 rounded-full object-cover border border-white/10 shrink-0" />
                        ) : (
                          <div className="w-7 h-7 shrink-0 rounded-full bg-gradient-to-br from-purple-600/40 to-emerald-500/40 border border-white/10 flex items-center justify-center text-[11px] font-semibold text-white">
                            {requester.name.slice(0, 1).toUpperCase()}
                          </div>
                        )}
                        <p className="text-sm text-zinc-200 light:text-zinc-800 truncate">{formatDisplayName(requester.name)}</p>
                      </button>
                      <button
                        onClick={() => handleResolveRequest(r.id, true)}
                        disabled={resolvingId === r.id}
                        title="Aprovar"
                        className="p-1.5 rounded-lg text-emerald-400 hover:bg-emerald-500/10 transition-colors disabled:opacity-40 shrink-0"
                      >
                        <UserCheck size={15} />
                      </button>
                      <button
                        onClick={() => handleResolveRequest(r.id, false)}
                        disabled={resolvingId === r.id}
                        title="Recusar"
                        className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-500/10 transition-colors disabled:opacity-40 shrink-0"
                      >
                        <UserX size={15} />
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          <div className="border-t border-white/5 pt-5">
            <p className="text-xs font-medium text-zinc-400 light:text-zinc-600 mb-2">Membros ({members.length})</p>
            {roleError && <p className="text-[11px] text-rose-400 mb-2">{roleError}</p>}
            <div className="flex flex-col gap-1.5 max-h-64 overflow-y-auto pr-1">
              {members.map((m) => {
                const isCommunityAdmin = community.adminIds.includes(m!.id)
                return (
                  <div
                    key={m!.id}
                    className="flex items-center gap-2.5 py-1.5 rounded-lg hover:bg-white/5 light:hover:bg-black/5 transition-colors -mx-1.5 px-1.5"
                  >
                    <button onClick={() => setOpenProfileId(m!.id)} className="flex items-center gap-2.5 text-left flex-1 min-w-0">
                      <div className="relative shrink-0">
                        {m!.avatarUrl ? (
                          <img src={m!.avatarUrl} alt={m!.name} className="w-7 h-7 rounded-full object-cover border border-white/10" />
                        ) : (
                          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-600/40 to-emerald-500/40 border border-white/10 flex items-center justify-center text-[11px] font-semibold text-white">
                            {m!.name.slice(0, 1).toUpperCase()}
                          </div>
                        )}
                        <OnlineDot online={onlineUserIds.has(m!.id)} className="absolute -bottom-0.5 -right-0.5 border border-zinc-900 light:border-white" />
                      </div>
                      <p className="text-sm text-zinc-200 light:text-zinc-800 truncate">{formatDisplayName(m!.name)}</p>
                      {m!.role === 'admin' && <Crown size={12} className="text-amber-400 shrink-0" />}
                      {isCommunityAdmin && (
                        <span className="text-[10px] text-purple-300 border border-purple-500/30 bg-purple-500/10 px-1.5 py-0.5 rounded shrink-0">
                          admin da comunidade
                        </span>
                      )}
                    </button>
                    {canManageRoles && (
                      <button
                        onClick={() => handleToggleAdmin(m!.id, !isCommunityAdmin)}
                        disabled={togglingId === m!.id}
                        title={isCommunityAdmin ? 'Remover admin da comunidade' : 'Tornar admin da comunidade'}
                        className="p-1.5 rounded-lg text-zinc-500 hover:text-purple-300 hover:bg-purple-500/10 transition-colors disabled:opacity-40 shrink-0"
                      >
                        {isCommunityAdmin ? <ShieldMinus size={14} /> : <ShieldPlus size={14} />}
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
      {openProfileId && <ProfileModal userId={openProfileId} onClose={() => setOpenProfileId(null)} />}
    </div>,
    document.body,
  )
}
