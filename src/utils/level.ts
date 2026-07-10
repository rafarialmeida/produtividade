export interface LevelInfo {
  level: number
  xp: number
  bandStart: number
  bandWidth: number
  xpIntoLevel: number
  xpToNextLevel: number
  progress: number
}

/**
 * Nível positivo: banda cresce 10 XP a cada nível (nível 1 = 0-9, nível 2 = 10-29,
 * nível 3 = 30-59, ...). Nível negativo: bandas fixas de 5 XP (nível -1 = -1 a -5,
 * nível -2 = -6 a -10, ...) — cai de nível duas vezes mais rápido do que sobe.
 */
export function getLevelInfo(xp: number): LevelInfo {
  if (xp >= 0) {
    let level = 1
    let bandStart = 0
    let bandWidth = 10
    while (xp >= bandStart + bandWidth) {
      bandStart += bandWidth
      level++
      bandWidth = 10 * level
    }
    const xpIntoLevel = xp - bandStart
    return { level, xp, bandStart, bandWidth, xpIntoLevel, xpToNextLevel: bandWidth - xpIntoLevel, progress: xpIntoLevel / bandWidth }
  }

  const n = Math.ceil(-xp / 5)
  const level = -n
  const bandWidth = 5
  const bandStart = -(5 * (n - 1) + 1)
  const xpIntoLevel = bandStart - xp
  return { level, xp, bandStart, bandWidth, xpIntoLevel, xpToNextLevel: bandWidth - xpIntoLevel, progress: xpIntoLevel / bandWidth }
}
