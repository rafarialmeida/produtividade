import { useEffect, useRef, useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { useAppStore } from '../store/useStore'
import type { Notification } from '../types'

export default function NotificationToasts({ userId }: { userId: string }) {
  const notifications = useAppStore((s) => s.notifications)
  const markNotificationRead = useAppStore((s) => s.markNotificationRead)
  const [visible, setVisible] = useState<Notification[]>([])
  const seen = useRef<Set<string>>(new Set())

  useEffect(() => {
    const fresh = notifications.filter(
      (n) => n.userId === userId && !n.read && !seen.current.has(n.id),
    )
    if (fresh.length === 0) return
    fresh.forEach((n) => seen.current.add(n.id))
    setVisible((v) => [...fresh, ...v])
    fresh.forEach((n) => {
      setTimeout(() => {
        setVisible((v) => v.filter((x) => x.id !== n.id))
        markNotificationRead(n.id)
      }, 6000)
    })
  }, [notifications, userId, markNotificationRead])

  if (visible.length === 0) return null

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 w-[min(360px,calc(100vw-2rem))]">
      {visible.map((n) => (
        <div
          key={n.id}
          className="animate-toast-in animate-pulse-glow glass-panel border border-rose-500/50 rounded-xl p-4 flex gap-3 items-start"
        >
          <AlertTriangle className="text-rose-400 shrink-0 mt-0.5" size={20} />
          <div>
            <p className="text-sm font-semibold text-rose-300">Penalidade aplicada</p>
            <p className="text-sm text-zinc-300 mt-0.5">{n.message}</p>
          </div>
        </div>
      ))}
    </div>
  )
}
