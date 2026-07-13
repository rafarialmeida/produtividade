export function formatDeadline(iso: string) {
  const d = new Date(iso)
  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatRelative(iso: string) {
  const diffMs = new Date(iso).getTime() - Date.now()
  const abs = Math.abs(diffMs)
  const mins = Math.round(abs / 60000)
  const hours = Math.round(abs / 3600000)
  const days = Math.round(abs / 86400000)

  let label: string
  if (mins < 60) label = `${mins} min`
  else if (hours < 24) label = `${hours} h`
  else label = `${days} d`

  return diffMs >= 0 ? `em ${label}` : `há ${label}`
}

export function isNearDeadline(iso: string, thresholdHours = 6) {
  const diffMs = new Date(iso).getTime() - Date.now()
  return diffMs > 0 && diffMs <= thresholdHours * 3600000
}

export function isPastDeadline(iso: string) {
  return new Date(iso).getTime() < Date.now()
}

export function formatDurationHours(hours: number | null | undefined): string {
  if (hours == null) return '—'
  if (hours >= 48) return `${(hours / 24).toFixed(1)} dias`
  return `${hours.toFixed(1)}h`
}

export function toDatetimeLocalValue(date: Date) {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}
