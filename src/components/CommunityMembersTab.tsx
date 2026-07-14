import { useEffect, useMemo, useState } from 'react'
import { Crown, ShieldMinus, ShieldPlus, UserCheck, Users, UserX } from 'lucide-react'
import { useAppStore } from '../store/useStore'
import type { CommunityJoinRequest } from '../types'
import OnlineDot from './OnlineDot'
import ProfileModal from './ProfileModal'
import { formatDisplayName } from '../utils/name'

export default function CommunityMembersTab({ communityId }: { communityId: string }) {
  const authUser = useAppStore((s) => s.authUser)
  const community = useAppStore((s) => s.getCommunityById(communityId))
  const users = useAppStore((s) => s.users)
  const onlineUserIds = useAppStore((s) => s.onlineUserIds)
  const setCommunityAdmin = useAppStore((s) => s.setCommunityAdmin)
  const removeCommunityMember = useAppStore((s) => s.removeCommunityMember)
  const fetchJoinRequests = useAppStore((s) => s.fetchJoinRequests)
  const approveJoinRequest = useAppStore((s) => s.approveJoinRequest)
  const rejectJoinRequest = useAppStore((s) => s.rejectJoinRequest)

  const [onlyOnline, setOnlyOnline] = useState(false)
  const [openProfileId, setOpenProfileId] = useState<string | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [roleError, setRoleError] = useState('')
  const [joinRequests, setJoinRequests] = useState<CommunityJoinRequest[]>([])
  const [resolvingId, setResolvingId] = useState<string | null>(null)
  const [requestError, setRequestError] = useState('')

  const canManageMembers = Boolean(
    authUser && community && (authUser.role === 'admin' || community.adminIds.includes(authUser.id)),
  )

  useEffect(() => {
    if (!canManageMembers) return
    let cancelled = false
    fetchJoinRequests(communityId).then((rows) => {
      if (!cancelled) setJoinRequests(rows)
    })
    return () => {
      cancelled = true
    }
  }, [communityId, canManageMembers, fetchJoinRequests])

  const members = useMemo(() => {
    const all = (community?.memberIds ?? [])
      .map((id) => users.find((u) => u.id === id))
      .filter((u): u is NonNullable<typeof u> => Boolean(u))
      .sort((a, b) => a.name.localeCompare(b.name))
    return onlyOnline ? all.filter((u) => onlineUserIds.has(u.id)) : all
  }, [community, users, onlyOnline, onlineUserIds])

  if (!community) return null

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

  async function handleRemove(memberId: string, name: string) {
    if (!window.confirm(`Remover ${name} da comunidade?`)) return
    setRoleError('')
    setRemovingId(memberId)
    try {
      const error = await removeCommunityMember(communityId, memberId)
      if (error) setRoleError(error === 'LAST_ADMIN' ? 'Precisa ter pelo menos um admin na comunidade.' : error)
    } finally {
      setRemovingId(null)
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

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-1.5 text-sm font-semibold text-zinc-300 light:text-zinc-700">
          <Users size={15} className="text-purple-400" /> Membros ({members.length})
        </h2>
        <button
          type="button"
          onClick={() => setOnlyOnline((v) => !v)}
          className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg border transition-colors ${
            onlyOnline
              ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
              : 'border-white/10 bg-white/[0.03] text-zinc-400 hover:bg-white/5 light:border-black/10 light:bg-black/[0.02] light:text-zinc-600 light:hover:bg-black/5'
          }`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${onlyOnline ? 'bg-emerald-400' : 'bg-zinc-500'}`} />
          Somente online
        </button>
      </div>

      {roleError && <p className="text-[11px] text-rose-400">{roleError}</p>}

      <div className="glass-panel rounded-2xl overflow-hidden divide-y divide-white/5">
        {members.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-zinc-500">
            Nenhum membro {onlyOnline ? 'online' : ''} no momento.
          </p>
        ) : (
          members.map((m) => {
            const isCommunityAdmin = community.adminIds.includes(m.id)
            return (
              <div
                key={m.id}
                className="flex items-center gap-2.5 px-4 py-2.5 hover:bg-white/5 light:hover:bg-black/5 transition-colors"
              >
                <button onClick={() => setOpenProfileId(m.id)} className="flex items-center gap-2.5 text-left flex-1 min-w-0">
                  <div className="relative shrink-0">
                    {m.avatarUrl ? (
                      <img src={m.avatarUrl} alt={m.name} className="w-8 h-8 rounded-full object-cover border border-white/10" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-600/40 to-emerald-500/40 border border-white/10 flex items-center justify-center text-xs font-semibold text-white">
                        {m.name.slice(0, 1).toUpperCase()}
                      </div>
                    )}
                    <OnlineDot online={onlineUserIds.has(m.id)} className="absolute -bottom-0.5 -right-0.5 border border-zinc-900 light:border-white" />
                  </div>
                  <p className="text-sm text-zinc-200 light:text-zinc-800 truncate">{formatDisplayName(m.name)}</p>
                  {m.role === 'admin' && <Crown size={12} className="text-amber-400 shrink-0" />}
                  {isCommunityAdmin && (
                    <span className="text-[10px] text-purple-300 border border-purple-500/30 bg-purple-500/10 px-1.5 py-0.5 rounded shrink-0">
                      admin da comunidade
                    </span>
                  )}
                </button>
                {canManageMembers && (
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleToggleAdmin(m.id, !isCommunityAdmin)}
                      disabled={togglingId === m.id || removingId === m.id}
                      title={isCommunityAdmin ? 'Remover admin da comunidade' : 'Tornar admin da comunidade'}
                      className="p-1.5 rounded-lg text-zinc-500 hover:text-purple-300 hover:bg-purple-500/10 transition-colors disabled:opacity-40"
                    >
                      {isCommunityAdmin ? <ShieldMinus size={14} /> : <ShieldPlus size={14} />}
                    </button>
                    <button
                      onClick={() => handleRemove(m.id, m.name)}
                      disabled={togglingId === m.id || removingId === m.id}
                      title="Excluir membro"
                      className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors disabled:opacity-40"
                    >
                      <UserX size={14} />
                    </button>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {canManageMembers && joinRequests.length > 0 && (
        <div>
          <p className="text-xs font-medium text-zinc-400 light:text-zinc-600 mb-2">Pedidos pendentes ({joinRequests.length})</p>
          {requestError && <p className="text-[11px] text-rose-400 mb-2">{requestError}</p>}
          <div className="glass-panel rounded-2xl overflow-hidden divide-y divide-amber-500/10">
            {joinRequests.map((r) => {
              const requester = users.find((u) => u.id === r.userId)
              if (!requester) return null
              return (
                <div key={r.id} className="flex items-center gap-2.5 px-4 py-2.5 bg-amber-500/[0.05]">
                  <button onClick={() => setOpenProfileId(requester.id)} className="flex items-center gap-2.5 text-left flex-1 min-w-0">
                    {requester.avatarUrl ? (
                      <img
                        src={requester.avatarUrl}
                        alt={requester.name}
                        className="w-8 h-8 rounded-full object-cover border border-white/10 shrink-0"
                      />
                    ) : (
                      <div className="w-8 h-8 shrink-0 rounded-full bg-gradient-to-br from-purple-600/40 to-emerald-500/40 border border-white/10 flex items-center justify-center text-xs font-semibold text-white">
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

      {openProfileId && <ProfileModal userId={openProfileId} onClose={() => setOpenProfileId(null)} />}
    </div>
  )
}
