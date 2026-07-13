export default function OnlineDot({ online, className = '' }: { online: boolean; className?: string }) {
  if (!online) return null
  return (
    <span
      title="Online"
      className={`w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)] shrink-0 ${className}`}
    />
  )
}
