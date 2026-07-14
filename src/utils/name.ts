// Nome + sobrenome cabem soltos; só abrevia (ex.: "Rafaela A.") quando o nome
// completo passa de 20 caracteres, pra não estourar espaços apertados (rankings,
// listas de membros) sem perder legibilidade nos casos comuns.
export function formatDisplayName(fullName: string): string {
  const trimmed = fullName.trim()
  if (trimmed.length <= 20) return trimmed
  const parts = trimmed.split(/\s+/).filter(Boolean)
  if (parts.length < 2) return trimmed
  const first = parts[0]
  const lastInitial = parts[parts.length - 1].charAt(0).toUpperCase()
  return `${first} ${lastInitial}.`
}
