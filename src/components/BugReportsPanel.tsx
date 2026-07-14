import { useEffect, useState } from 'react'
import { Bug, Loader2, Sparkles } from 'lucide-react'
import { useAppStore } from '../store/useStore'
import type { BugReport } from '../types'
import { formatDeadline } from '../utils/date'

export default function BugReportsPanel() {
  const fetchBugReports = useAppStore((s) => s.fetchBugReports)
  const [reports, setReports] = useState<BugReport[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    fetchBugReports().then((rows) => {
      if (cancelled) return
      setReports(rows)
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [fetchBugReports])

  return (
    <div>
      <h2 className="flex items-center gap-1.5 text-sm font-semibold text-zinc-300 light:text-zinc-700 mb-3">
        <Bug size={15} className="text-rose-300 light:text-rose-700" /> Relatos de bug e melhoria ({reports.length})
      </h2>
      <div className="glass-panel rounded-2xl overflow-hidden divide-y divide-white/5">
        {loading ? (
          <div className="px-6 py-10 flex items-center justify-center text-zinc-500">
            <Loader2 size={18} className="animate-spin" />
          </div>
        ) : reports.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-zinc-500">Nenhum relato ainda.</p>
        ) : (
          reports.map((r) => (
            <div key={r.id} className="px-4 py-3 flex flex-col gap-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className={`flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded border ${
                    r.type === 'bug'
                      ? 'border-rose-500/40 bg-rose-500/10 text-rose-300 light:text-rose-700'
                      : 'border-purple-500/40 bg-purple-500/10 text-purple-300 light:text-purple-700'
                  }`}
                >
                  {r.type === 'bug' ? <Bug size={11} /> : <Sparkles size={11} />}
                  {r.type === 'bug' ? 'Bug' : 'Melhoria'}
                </span>
                <span className="text-xs text-zinc-400 light:text-zinc-600">{r.reporterName}</span>
                <span className="text-[11px] text-zinc-600">· {formatDeadline(r.createdAt)}</span>
                {r.pageUrl && <span className="text-[11px] text-zinc-600">· {r.pageUrl}</span>}
              </div>
              <p className="text-sm text-zinc-200 light:text-zinc-800">{r.message}</p>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
