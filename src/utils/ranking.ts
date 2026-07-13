export interface RankableMetrics {
  id: string
  leadTimeHours?: number
  cycleTimeHours?: number
  tasksCompleted: number
  subtasksCompleted: number
}

export interface RankedEntry<T> {
  item: T
  compositeRank: number | null
}

function buildRankMap<T extends RankableMetrics>(
  items: T[],
  key: 'leadTimeHours' | 'cycleTimeHours' | 'tasksCompleted' | 'subtasksCompleted',
  ascending: boolean,
): { map: Map<string, number>; worst: number } {
  const withValue = items.filter((i) => i[key] != null)
  const sorted = [...withValue].sort((a, b) => {
    const av = a[key] as number
    const bv = b[key] as number
    return ascending ? av - bv : bv - av
  })
  const map = new Map<string, number>()
  sorted.forEach((item, idx) => map.set(item.id, idx + 1))
  return { map, worst: sorted.length + 1 }
}

// Rankeia por posição média em 4 critérios (menor tempo é melhor, mais
// concluídas é melhor) — quem não tem nenhuma tarefa concluída fica sem
// posição (compositeRank: null), listado por último.
export function computeCompositeRanking<T extends RankableMetrics>(items: T[]): RankedEntry<T>[] {
  const active = items.filter((i) => i.tasksCompleted > 0)
  const inactive = items.filter((i) => i.tasksCompleted === 0)

  const lead = buildRankMap(active, 'leadTimeHours', true)
  const cycle = buildRankMap(active, 'cycleTimeHours', true)
  const tasks = buildRankMap(active, 'tasksCompleted', false)
  const subtasks = buildRankMap(active, 'subtasksCompleted', false)

  const scored = active.map((item) => {
    const r1 = lead.map.get(item.id) ?? lead.worst
    const r2 = cycle.map.get(item.id) ?? cycle.worst
    const r3 = tasks.map.get(item.id) ?? tasks.worst
    const r4 = subtasks.map.get(item.id) ?? subtasks.worst
    return { item, avgRank: (r1 + r2 + r3 + r4) / 4 }
  })

  scored.sort((a, b) => a.avgRank - b.avgRank)

  const ranked: RankedEntry<T>[] = scored.map((entry, idx) => ({ item: entry.item, compositeRank: idx + 1 }))
  const unranked: RankedEntry<T>[] = inactive.map((item) => ({ item, compositeRank: null }))

  return [...ranked, ...unranked]
}
