import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { urlBase64ToUint8Array } from '../lib/push'

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY

export type PushState = 'unsupported' | 'checking' | 'subscribed' | 'unsubscribed'

export function usePushSubscription(userId: string | undefined) {
  const [state, setState] = useState<PushState>('checking')

  const supported =
    typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && Boolean(VAPID_PUBLIC_KEY)

  useEffect(() => {
    if (!supported || !userId) {
      setState('unsupported')
      return
    }
    let cancelled = false
    navigator.serviceWorker.ready.then(async (reg) => {
      const sub = await reg.pushManager.getSubscription()
      if (!cancelled) setState(sub ? 'subscribed' : 'unsubscribed')
    })
    return () => {
      cancelled = true
    }
  }, [supported, userId])

  const subscribe = useCallback(async () => {
    if (!supported || !userId) return
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') {
      setState('unsubscribed')
      return
    }
    const reg = await navigator.serviceWorker.ready
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    })
    const json = sub.toJSON()
    if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) return
    await supabase
      .from('push_subscriptions')
      .upsert({ user_id: userId, endpoint: json.endpoint, p256dh: json.keys.p256dh, auth: json.keys.auth }, { onConflict: 'endpoint' })
    setState('subscribed')
  }, [supported, userId])

  const unsubscribe = useCallback(async () => {
    if (!supported) return
    const reg = await navigator.serviceWorker.ready
    const sub = await reg.pushManager.getSubscription()
    if (sub) {
      await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
      await sub.unsubscribe()
    }
    setState('unsubscribed')
  }, [supported])

  return { state, subscribe, unsubscribe }
}
