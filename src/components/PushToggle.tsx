import { useState } from 'react'
import { BellOff, BellRing } from 'lucide-react'
import { usePushSubscription } from '../hooks/usePushSubscription'
import NotificationPreferencesModal from './NotificationPreferencesModal'

export default function PushToggle({ userId }: { userId: string }) {
  const { state } = usePushSubscription(userId)
  const [showModal, setShowModal] = useState(false)

  if (state === 'checking') return null

  const subscribed = state === 'subscribed'

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        title="Notificações"
        className={`p-2 rounded-lg transition-colors ${
          subscribed
            ? 'text-emerald-400 light:text-emerald-600 hover:text-emerald-300 light:hover:text-emerald-600 hover:bg-emerald-500/10'
            : 'text-zinc-500 hover:text-white hover:bg-white/5 light:hover:text-zinc-900 light:hover:bg-black/5'
        }`}
      >
        {subscribed ? <BellRing size={16} /> : <BellOff size={16} />}
      </button>
      {showModal && <NotificationPreferencesModal userId={userId} onClose={() => setShowModal(false)} />}
    </>
  )
}
