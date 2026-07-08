import { useEffect } from 'react'
import { useAppStore } from '../store/useStore'

export function useExpirationTicker() {
  const checkExpirations = useAppStore((s) => s.checkExpirations)

  useEffect(() => {
    checkExpirations()
    const id = setInterval(() => checkExpirations(), 15000)
    return () => clearInterval(id)
  }, [checkExpirations])
}
