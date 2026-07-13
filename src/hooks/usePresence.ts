import { useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAppStore } from '../store/useStore'

// Canal único de presença do app inteiro (não escopado a uma comunidade ou
// tabuleiro específico) — cada cliente autenticado se anuncia aqui com sua
// própria chave de presença igual ao userId, então o estado sincronizado já
// vem indexado por userId.
const PRESENCE_CHANNEL = 'presence:app'

export function usePresence() {
  const userId = useAppStore((s) => s.authUser?.id)
  const setOnlineUserIds = useAppStore((s) => s.setOnlineUserIds)

  useEffect(() => {
    if (!userId) {
      setOnlineUserIds(new Set())
      return
    }

    const channel = supabase.channel(PRESENCE_CHANNEL, {
      config: { presence: { key: userId } },
    })

    channel
      .on('presence', { event: 'sync' }, () => {
        setOnlineUserIds(new Set(Object.keys(channel.presenceState())))
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') channel.track({ online_at: new Date().toISOString() })
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId, setOnlineUserIds])
}
