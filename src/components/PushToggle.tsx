import { BellOff, BellRing } from 'lucide-react'
import { usePushSubscription } from '../hooks/usePushSubscription'

export default function PushToggle({ userId }: { userId: string }) {
  const { state, subscribe, unsubscribe } = usePushSubscription(userId)

  if (state === 'unsupported' || state === 'checking') return null

  const subscribed = state === 'subscribed'

  return (
    <button
      onClick={() => (subscribed ? unsubscribe() : subscribe())}
      title={subscribed ? 'Notificações ativadas — clique para desativar' : 'Ativar notificações push'}
      className={`p-2 rounded-lg transition-colors ${
        subscribed
          ? 'text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10'
          : 'text-zinc-500 hover:text-white hover:bg-white/5 light:hover:text-zinc-900 light:hover:bg-black/5'
      }`}
    >
      {subscribed ? <BellRing size={16} /> : <BellOff size={16} />}
    </button>
  )
}
