import { createPortal } from 'react-dom'
import { BarChart3, Bell, BellOff, BellRing, CheckCircle2, Clock, TriangleAlert, X } from 'lucide-react'
import { useAppStore } from '../store/useStore'
import { usePushSubscription } from '../hooks/usePushSubscription'

function Toggle({ checked, onChange, disabled }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`shrink-0 w-10 h-6 rounded-full transition-colors relative disabled:opacity-30 disabled:cursor-not-allowed ${
        checked ? 'bg-emerald-500/80' : 'bg-white/10 light:bg-black/15'
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white light:shadow-sm transition-transform ${
          checked ? 'translate-x-4' : 'translate-x-0'
        }`}
      />
    </button>
  )
}

export default function NotificationPreferencesModal({ userId, onClose }: { userId: string; onClose: () => void }) {
  const authUser = useAppStore((s) => s.authUser)
  const updateNotificationPreferences = useAppStore((s) => s.updateNotificationPreferences)
  const { state: pushState, subscribe, unsubscribe } = usePushSubscription(userId)

  if (!authUser) return null

  const pushSupported = pushState !== 'unsupported'
  const pushSubscribed = pushState === 'subscribed'

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-4 overflow-y-auto bg-black/70 backdrop-blur-sm">
      <div className="glass-panel neon-border-purple rounded-2xl w-full max-w-md my-8">
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/5">
          <div className="flex items-center gap-2.5">
            <Bell size={18} className="text-purple-300 light:text-purple-600" />
            <h2 className="text-lg font-bold text-white light:text-zinc-900">Notificações</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-white/10 light:hover:text-zinc-900 light:hover:bg-black/10">
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-5 flex flex-col gap-5">
          {pushSupported ? (
            <div className="flex items-start justify-between gap-3">
              <div className="flex gap-2.5">
                {pushSubscribed ? (
                  <BellRing size={16} className="text-emerald-400 light:text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <BellOff size={16} className="text-zinc-500 shrink-0 mt-0.5" />
                )}
                <div>
                  <p className="text-sm font-medium text-white light:text-zinc-900">Notificações push</p>
                  <p className="text-xs text-zinc-500">Avisos fora do app, mesmo com ele fechado ou em segundo plano.</p>
                </div>
              </div>
              <Toggle checked={pushSubscribed} onChange={(v) => (v ? subscribe() : unsubscribe())} />
            </div>
          ) : (
            <p className="text-xs text-amber-400 light:text-amber-600 -mt-1">Seu navegador não tem suporte a notificações push.</p>
          )}

          <p className="text-xs text-zinc-500 border-t border-white/5 pt-4 -mb-1">
            Escolha o que você quer receber como notificação push. Isso não afeta os avisos dentro do app.
          </p>

          <div className="flex items-start justify-between gap-3">
            <div className="flex gap-2.5">
              <Clock size={16} className="text-amber-400 light:text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-white light:text-zinc-900">Prazo chegando perto</p>
                <p className="text-xs text-zinc-500">Aviso quando faltam poucas horas para o prazo.</p>
              </div>
            </div>
            <Toggle
              checked={authUser.notifyReminder}
              disabled={!pushSubscribed}
              onChange={(v) => updateNotificationPreferences({ notifyReminder: v })}
            />
          </div>

          <div className="flex items-start justify-between gap-3 pl-6 -mt-2">
            <div className="flex gap-2.5">
              <div>
                <p className="text-sm font-medium text-white light:text-zinc-900">Só urgência Alta ou Crítica</p>
                <p className="text-xs text-zinc-500">Ignora avisos de prazo para tarefas Baixa/Média.</p>
              </div>
            </div>
            <Toggle
              checked={authUser.notifyOnlyUrgent}
              disabled={!pushSubscribed || !authUser.notifyReminder}
              onChange={(v) => updateNotificationPreferences({ notifyOnlyUrgent: v })}
            />
          </div>

          <div className="flex items-start justify-between gap-3 border-t border-white/5 pt-5">
            <div className="flex gap-2.5">
              <TriangleAlert size={16} className="text-rose-400 light:text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-white light:text-zinc-900">Tarefa expirada</p>
                <p className="text-xs text-zinc-500">Aviso quando você perder pontos por não cumprir um prazo.</p>
              </div>
            </div>
            <Toggle
              checked={authUser.notifyExpired}
              disabled={!pushSubscribed}
              onChange={(v) => updateNotificationPreferences({ notifyExpired: v })}
            />
          </div>

          <div className="flex items-start justify-between gap-3 border-t border-white/5 pt-5">
            <div className="flex gap-2.5">
              <CheckCircle2 size={16} className="text-emerald-400 light:text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-white light:text-zinc-900">Tarefa concluída</p>
                <p className="text-xs text-zinc-500">Um parabéns quando você fechar uma tarefa.</p>
              </div>
            </div>
            <Toggle
              checked={authUser.notifyCompleted}
              disabled={!pushSubscribed}
              onChange={(v) => updateNotificationPreferences({ notifyCompleted: v })}
            />
          </div>

          <div className="flex items-start justify-between gap-3 border-t border-white/5 pt-5">
            <div className="flex gap-2.5">
              <BarChart3 size={16} className="text-sky-300 light:text-sky-700 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-white light:text-zinc-900">Resumo semanal</p>
                <p className="text-xs text-zinc-500">
                  Toda semana, quantas tarefas você concluiu (vs a semana anterior) e sua posição no Muro Global.
                </p>
              </div>
            </div>
            <Toggle
              checked={authUser.notifyWeeklyDigest}
              disabled={!pushSubscribed}
              onChange={(v) => updateNotificationPreferences({ notifyWeeklyDigest: v })}
            />
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}
