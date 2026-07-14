import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Check, Loader2, X, ZoomIn } from 'lucide-react'

const VIEWPORT = 260
const OUTPUT_SIZE = 512

export default function ImageCropperModal({
  source,
  onCancel,
  onConfirm,
}: {
  source: File | string
  onCancel: () => void
  onConfirm: (blob: Blob) => void | Promise<void>
}) {
  const imgRef = useRef<HTMLImageElement>(null)
  const [naturalSize, setNaturalSize] = useState<{ w: number; h: number } | null>(null)
  const [baseScale, setBaseScale] = useState(1)
  const [zoom, setZoom] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const dragRef = useRef<{ startX: number; startY: number; offsetX: number; offsetY: number } | null>(null)

  // Criado e revogado dentro do mesmo efeito (nunca no corpo do componente):
  // gerar um object URL novo a cada render fazia a <img> recarregar sem
  // parar (o navegador trata como uma imagem nova), o que resetava
  // zoom/posição sozinho e podia travar a aba no "Usar essa foto".
  const [src, setSrc] = useState<string | undefined>(() => (typeof source === 'string' ? source : undefined))

  useEffect(() => {
    if (typeof source === 'string') {
      setSrc(source)
      return
    }
    const url = URL.createObjectURL(source)
    setSrc(url)
    return () => URL.revokeObjectURL(url)
  }, [source])

  function handleImgLoad() {
    const img = imgRef.current
    if (!img) return
    const w = img.naturalWidth
    const h = img.naturalHeight
    const scale = Math.max(VIEWPORT / w, VIEWPORT / h)
    setNaturalSize({ w, h })
    setBaseScale(scale)
    setZoom(1)
    setOffset({ x: 0, y: 0 })
  }

  const scale = baseScale * zoom
  const dw = naturalSize ? naturalSize.w * scale : 0
  const dh = naturalSize ? naturalSize.h * scale : 0
  const maxOffsetX = Math.max(0, (dw - VIEWPORT) / 2)
  const maxOffsetY = Math.max(0, (dh - VIEWPORT) / 2)

  function clamp(o: { x: number; y: number }, mx: number, my: number) {
    return { x: Math.min(mx, Math.max(-mx, o.x)), y: Math.min(my, Math.max(-my, o.y)) }
  }

  function handlePointerDown(e: React.PointerEvent) {
    ;(e.target as Element).setPointerCapture(e.pointerId)
    dragRef.current = { startX: e.clientX, startY: e.clientY, offsetX: offset.x, offsetY: offset.y }
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (!dragRef.current) return
    const dx = e.clientX - dragRef.current.startX
    const dy = e.clientY - dragRef.current.startY
    setOffset(
      clamp({ x: dragRef.current.offsetX + dx, y: dragRef.current.offsetY + dy }, maxOffsetX, maxOffsetY),
    )
  }

  function handlePointerUp() {
    dragRef.current = null
  }

  function handleZoomChange(z: number) {
    setZoom(z)
    const newScale = baseScale * z
    const newDw = naturalSize ? naturalSize.w * newScale : 0
    const newDh = naturalSize ? naturalSize.h * newScale : 0
    setOffset((o) => clamp(o, Math.max(0, (newDw - VIEWPORT) / 2), Math.max(0, (newDh - VIEWPORT) / 2)))
  }

  async function handleConfirm() {
    const img = imgRef.current
    if (!img || !naturalSize) return
    setSaving(true)
    setError('')
    try {
      const imgLeft = VIEWPORT / 2 - dw / 2 + offset.x
      const imgTop = VIEWPORT / 2 - dh / 2 + offset.y
      const sx = -imgLeft / scale
      const sy = -imgTop / scale
      const sSize = VIEWPORT / scale

      const canvas = document.createElement('canvas')
      canvas.width = OUTPUT_SIZE
      canvas.height = OUTPUT_SIZE
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.drawImage(img, sx, sy, sSize, sSize, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE)

      const blob: Blob | null = await new Promise((resolve) => canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.92))
      if (blob) await onConfirm(blob)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não deu pra processar essa imagem.')
    } finally {
      setSaving(false)
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-start sm:items-center justify-center p-4 overflow-y-auto bg-black/80 backdrop-blur-sm">
      <div className="glass-panel neon-border-purple rounded-2xl w-full max-w-sm my-8">
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/5">
          <h2 className="text-lg font-bold text-white light:text-zinc-900">Ajustar foto</h2>
          <button onClick={onCancel} className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-white/10 light:hover:text-zinc-900 light:hover:bg-black/10">
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-5 flex flex-col items-center gap-5">
          <div
            className="relative rounded-full overflow-hidden bg-black/40 border border-white/10 touch-none select-none cursor-grab active:cursor-grabbing"
            style={{ width: VIEWPORT, height: VIEWPORT }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
          >
            {/* eslint-disable-next-line jsx-a11y/alt-text */}
            <img
              ref={imgRef}
              src={src}
              crossOrigin={typeof source === 'string' ? 'anonymous' : undefined}
              onLoad={handleImgLoad}
              draggable={false}
              className="absolute top-1/2 left-1/2 max-w-none pointer-events-none"
              style={{
                width: naturalSize ? naturalSize.w * scale : undefined,
                height: naturalSize ? naturalSize.h * scale : undefined,
                transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px))`,
              }}
            />
          </div>

          <div className="w-full flex items-center gap-3">
            <ZoomIn size={15} className="text-zinc-500 shrink-0" />
            <input
              type="range"
              min={1}
              max={3}
              step={0.01}
              value={zoom}
              onChange={(e) => handleZoomChange(Number(e.target.value))}
              className="w-full accent-purple-500"
            />
          </div>

          <p className="text-[11px] text-zinc-500 text-center">Arraste para posicionar e use o zoom para enquadrar.</p>
          {error && <p className="text-xs text-rose-400 light:text-rose-600 text-center">{error}</p>}

          <button onClick={handleConfirm} disabled={saving || !naturalSize} className="btn-primary disabled:opacity-50">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <><Check size={15} /> Usar essa foto</>}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
