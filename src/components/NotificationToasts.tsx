import { useEffect, useRef, useState } from 'react'
import { AlertTriangle, Clock, Info, PartyPopper } from 'lucide-react'
import { useAppStore } from '../store/useStore'
import type { Notification } from '../types'

const TOAST_CONFIG: Record<Notification['type'], { icon: typeof AlertTriangle; border: string; title: string; titleColor: string }> = {
  penalty: { icon: AlertTriangle, border: 'border-rose-500/50', title: 'Penalidade aplicada', titleColor: 'text-rose-300 light:text-rose-600' },
  warning: { icon: Clock, border: 'border-amber-500/50', title: 'Prazo chegando', titleColor: 'text-amber-300 light:text-amber-600' },
  success: { icon: PartyPopper, border: 'border-emerald-500/50', title: 'Boa!', titleColor: 'text-emerald-300 light:text-emerald-600' },
  info: { icon: Info, border: 'border-purple-500/50', title: 'Aviso', titleColor: 'text-purple-300 light:text-purple-600' },
}

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
      {visible.map((n) => {
        const cfg = TOAST_CONFIG[n.type]
        return (
          <div
            key={n.id}
            className={`animate-toast-in glass-panel border ${cfg.border} rounded-xl p-4 flex gap-3 items-start ${
              n.type === 'penalty' ? 'animate-pulse-glow' : ''
            }`}
          >
            <cfg.icon className={`${cfg.titleColor} shrink-0 mt-0.5`} size={20} />
            <div>
              <p className={`text-sm font-semibold ${cfg.titleColor}`}>{cfg.title}</p>
              <p className="text-sm text-zinc-300 light:text-zinc-700 mt-0.5">{n.message}</p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
