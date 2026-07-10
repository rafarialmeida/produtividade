import { BellRing, CheckCircle2, Clock, Settings2, TriangleAlert, X } from 'lucide-react'
import { useAppStore } from '../store/useStore'

function Toggle({ checked, onChange, disabled }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`shrink-0 w-10 h-6 rounded-full transition-colors relative disabled:opacity-30 disabled:cursor-not-allowed ${
        checked ? 'bg-emerald-500/80' : 'bg-white/10'
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
          checked ? 'translate-x-4' : 'translate-x-0'
        }`}
      />
    </button>
  )
}

export default function NotificationPreferencesModal({ onClose }: { onClose: () => void }) {
  const authUser = useAppStore((s) => s.authUser)
  const updateNotificationPreferences = useAppStore((s) => s.updateNotificationPreferences)

  if (!authUser) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-4 overflow-y-auto bg-black/70 backdrop-blur-sm">
      <div className="glass-panel neon-border-purple rounded-2xl w-full max-w-md my-8">
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/5">
          <div className="flex items-center gap-2.5">
            <Settings2 size={18} className="text-purple-300" />
            <h2 className="text-lg font-bold text-white">Preferências de notificação</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-white/10">
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-5 flex flex-col gap-5">
          <p className="text-xs text-zinc-500 -mt-1">
            Escolha o que você quer receber como notificação push (fora do app). Isso não afeta os avisos dentro do app.
          </p>

          <div className="flex items-start justify-between gap-3">
            <div className="flex gap-2.5">
              <Clock size={16} className="text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-white">Prazo chegando perto</p>
                <p className="text-xs text-zinc-500">Aviso quando faltam poucas horas para o prazo.</p>
              </div>
            </div>
            <Toggle
              checked={authUser.notifyReminder}
              onChange={(v) => updateNotificationPreferences({ notifyReminder: v })}
            />
          </div>

          <div className="flex items-start justify-between gap-3 pl-6 -mt-2">
            <div className="flex gap-2.5">
              <div>
                <p className="text-sm font-medium text-white">Só urgência Alta ou Crítica</p>
                <p className="text-xs text-zinc-500">Ignora avisos de prazo para tarefas Baixa/Média.</p>
              </div>
            </div>
            <Toggle
              checked={authUser.notifyOnlyUrgent}
              disabled={!authUser.notifyReminder}
              onChange={(v) => updateNotificationPreferences({ notifyOnlyUrgent: v })}
            />
          </div>

          <div className="flex items-start justify-between gap-3 border-t border-white/5 pt-5">
            <div className="flex gap-2.5">
              <TriangleAlert size={16} className="text-rose-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-white">Tarefa expirada</p>
                <p className="text-xs text-zinc-500">Aviso quando você perder pontos por não cumprir um prazo.</p>
              </div>
            </div>
            <Toggle
              checked={authUser.notifyExpired}
              onChange={(v) => updateNotificationPreferences({ notifyExpired: v })}
            />
          </div>

          <div className="flex items-start justify-between gap-3 border-t border-white/5 pt-5">
            <div className="flex gap-2.5">
              <CheckCircle2 size={16} className="text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-white">Tarefa concluída</p>
                <p className="text-xs text-zinc-500">Um parabéns quando você fechar uma tarefa.</p>
              </div>
            </div>
            <Toggle
              checked={authUser.notifyCompleted}
              onChange={(v) => updateNotificationPreferences({ notifyCompleted: v })}
            />
          </div>

          <p className="flex items-center gap-1.5 text-[11px] text-zinc-600 border-t border-white/5 pt-4">
            <BellRing size={11} /> Lembre-se de ativar o sininho no topo para receber qualquer notificação push.
          </p>
        </div>
      </div>
    </div>
  )
}
