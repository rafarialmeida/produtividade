import { useEffect, useRef, useState } from 'react'
import { MessageCircle, X } from 'lucide-react'
import { useAppStore } from '../store/useStore'
import type { Notification } from '../types'
import { formatRelative } from '../utils/date'

export default function MessagesPanel({ userId }: { userId: string }) {
  const notifications = useAppStore((s) => s.notifications)
  const markNotificationRead = useAppStore((s) => s.markNotificationRead)
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const mine = notifications
    .filter((n) => n.userId === userId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 30)
  const unreadCount = mine.filter((n) => !n.read).length

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function handleClickItem(n: Notification) {
    if (!n.read) markNotificationRead(n.id)
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        title="Mensagens"
        className="relative p-2 rounded-lg text-zinc-500 hover:text-white hover:bg-white/5 light:hover:text-zinc-900 light:hover:bg-black/5 transition-colors"
      >
        <MessageCircle size={16} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center leading-none">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed left-2 right-2 top-16 sm:absolute sm:left-auto sm:right-0 sm:top-full sm:mt-2 sm:w-80 glass-panel neon-border-purple rounded-2xl overflow-hidden z-50 flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
            <p className="text-sm font-bold text-white light:text-zinc-900">Mensagens</p>
            <button
              onClick={() => setOpen(false)}
              className="p-1 rounded text-zinc-500 hover:text-white hover:bg-white/10 light:hover:text-zinc-900 light:hover:bg-black/10"
            >
              <X size={15} />
            </button>
          </div>
          <div className="max-h-[60vh] overflow-y-auto divide-y divide-white/5">
            {mine.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-zinc-500">Nenhuma mensagem ainda.</p>
            ) : (
              mine.map((n) => (
                <button
                  key={n.id}
                  onClick={() => handleClickItem(n)}
                  className={`w-full text-left px-4 py-3 hover:bg-white/5 light:hover:bg-black/5 transition-colors flex items-start gap-2 ${
                    !n.read ? 'bg-purple-500/[0.05]' : ''
                  }`}
                >
                  {!n.read && <span className="w-1.5 h-1.5 rounded-full bg-purple-400 mt-1.5 shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-sm ${
                        !n.read ? 'text-white light:text-zinc-900 font-medium' : 'text-zinc-400 light:text-zinc-600'
                      }`}
                    >
                      {n.message}
                    </p>
                    <p className="text-[11px] text-zinc-500 mt-1">{formatRelative(n.createdAt)}</p>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
