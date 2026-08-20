import { useEffect, useState } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  Lock,
  Loader2,
  MessageSquare,
  Plus,
  RotateCcw,
  Send,
  Trash2,
  Unlock,
  UserCog,
} from 'lucide-react'
import { useAppStore } from '../store/useStore'
import type { TaskComment, TaskEvent } from '../types'
import { formatDeadline, formatRelative } from '../utils/date'

type FeedItem = { key: string; createdAt: string } & (
  | { kind: 'comment'; comment: TaskComment }
  | { kind: 'event'; event: TaskEvent }
)

function eventSentence(event: TaskEvent, actorName: string, assigneeName?: string): string {
  switch (event.type) {
    case 'created':
      return `${actorName} criou a tarefa`
    case 'completed':
      return `${actorName} concluiu a tarefa`
    case 'reopened':
      return `${actorName} reabriu a tarefa`
    case 'blocked':
      return `${actorName} bloqueou a tarefa${event.metadata?.reason ? `: ${event.metadata.reason}` : ''}`
    case 'unblocked':
      return `${actorName} desbloqueou a tarefa`
    case 'assigned':
      return `${actorName} atribuiu a tarefa para ${assigneeName ?? 'alguém'}`
  }
}

function eventIcon(type: TaskEvent['type']) {
  switch (type) {
    case 'created':
      return Plus
    case 'completed':
      return CheckCircle2
    case 'reopened':
      return RotateCcw
    case 'blocked':
      return Lock
    case 'unblocked':
      return Unlock
    case 'assigned':
      return UserCog
  }
}

export default function TaskActivityFeed({ taskId }: { taskId: string }) {
  const authUser = useAppStore((s) => s.authUser)
  const getUserById = useAppStore((s) => s.getUserById)
  const fetchTaskActivity = useAppStore((s) => s.fetchTaskActivity)
  const addTaskComment = useAppStore((s) => s.addTaskComment)
  const deleteTaskComment = useAppStore((s) => s.deleteTaskComment)

  const [comments, setComments] = useState<TaskComment[]>([])
  const [events, setEvents] = useState<TaskEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [newComment, setNewComment] = useState('')
  const [posting, setPosting] = useState(false)
  const [postError, setPostError] = useState<string | null>(null)
  const [loadError, setLoadError] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetchTaskActivity(taskId).then((data) => {
      if (cancelled) return
      setComments(data.comments)
      setEvents(data.events)
      setLoadError(Boolean(data.error))
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [taskId, fetchTaskActivity])

  async function handlePost() {
    const trimmed = newComment.trim()
    if (!trimmed || posting) return
    setPosting(true)
    setPostError(null)
    try {
      const error = await addTaskComment(taskId, trimmed)
      if (error) {
        setPostError(error)
      } else {
        setNewComment('')
        const data = await fetchTaskActivity(taskId)
        setComments(data.comments)
        setEvents(data.events)
        setLoadError(Boolean(data.error))
      }
    } finally {
      setPosting(false)
    }
  }

  async function handleDeleteComment(id: string) {
    setComments((c) => c.filter((item) => item.id !== id))
    await deleteTaskComment(id)
  }

  const feed: FeedItem[] = [
    ...comments.map((c): FeedItem => ({ key: `c-${c.id}`, createdAt: c.createdAt, kind: 'comment', comment: c })),
    ...events.map((e): FeedItem => ({ key: `e-${e.id}`, createdAt: e.createdAt, kind: 'event', event: e })),
  ].sort((a, b) => b.createdAt.localeCompare(a.createdAt))

  return (
    <div className="flex flex-col gap-3">
      <h4 className="flex items-center gap-1.5 text-xs font-semibold text-zinc-300 light:text-zinc-700">
        <MessageSquare size={13} className="text-purple-400 light:text-purple-600" /> Comentário
      </h4>

      <div className="flex items-start gap-2">
        <textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              e.preventDefault()
              handlePost()
            }
          }}
          placeholder="Escrever um comentário..."
          rows={2}
          disabled={posting}
          className="input !text-xs flex-1 resize-none disabled:opacity-50"
        />
        <button
          type="button"
          onClick={handlePost}
          disabled={!newComment.trim() || posting}
          title="Comentar"
          className="p-2 rounded-lg bg-purple-500/15 text-purple-300 light:text-purple-600 border border-purple-500/30 hover:bg-purple-500/25 disabled:opacity-30 transition-colors shrink-0"
        >
          {posting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
        </button>
      </div>

      {postError && (
        <p className="flex items-center gap-1.5 text-xs text-rose-400 light:text-rose-600">
          <AlertTriangle size={12} className="shrink-0" /> Não foi possível enviar: {postError}
        </p>
      )}

      {loading ? (
        <p className="text-xs text-zinc-500 flex items-center gap-1.5">
          <Loader2 size={12} className="animate-spin" /> Carregando atividade...
        </p>
      ) : loadError ? (
        <p className="flex items-center gap-1.5 text-xs text-rose-400 light:text-rose-600">
          <AlertTriangle size={12} className="shrink-0" /> Não foi possível carregar a atividade. Tente recarregar a página em instantes.
        </p>
      ) : feed.length === 0 ? (
        <p className="text-xs text-zinc-500">Nenhuma atividade ainda.</p>
      ) : (
        <div className="flex flex-col gap-2.5">
          {feed.map((item) => {
            if (item.kind === 'comment') {
              const author = getUserById(item.comment.userId)
              const isOwn = item.comment.userId === authUser?.id
              return (
                <div key={item.key} className="flex items-start gap-2 rounded-xl border border-white/5 bg-white/[0.02] p-2.5 light:border-black/5 light:bg-black/[0.015]">
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] text-zinc-400 light:text-zinc-600">
                      <span className="font-medium text-zinc-300 light:text-zinc-700">{author?.name ?? 'Alguém'}</span>{' '}
                      <span title={formatDeadline(item.comment.createdAt)}>{formatRelative(item.comment.createdAt)}</span>
                    </p>
                    <p className="text-xs text-zinc-300 light:text-zinc-700 whitespace-pre-wrap break-words mt-0.5">{item.comment.text}</p>
                  </div>
                  {isOwn && (
                    <button
                      type="button"
                      onClick={() => handleDeleteComment(item.comment.id)}
                      title="Excluir comentário"
                      className="p-1 rounded text-zinc-600 hover:text-rose-400 light:hover:text-rose-600 shrink-0"
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              )
            }

            const actor = item.event.userId ? getUserById(item.event.userId) : undefined
            const assignee = item.event.metadata?.assigneeId ? getUserById(item.event.metadata.assigneeId) : undefined
            const Icon = eventIcon(item.event.type)
            return (
              <div key={item.key} className="flex items-center gap-2 text-[11px] text-zinc-500 px-0.5">
                <Icon size={12} className="shrink-0 text-zinc-600" />
                <span className="min-w-0 truncate">{eventSentence(item.event, actor?.name ?? 'Alguém', assignee?.name)}</span>
                <span className="shrink-0" title={formatDeadline(item.event.createdAt)}>
                  · {formatRelative(item.event.createdAt)}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
