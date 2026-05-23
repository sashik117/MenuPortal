import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react'
import type {
  ChangeEvent,
  PointerEvent as ReactPointerEvent,
  WheelEvent as ReactWheelEvent,
} from 'react'
import { ImagePlus, Move, RotateCcw, Upload } from 'lucide-react'

export type ImageCropperHandle = {
  getCroppedImage: () => Promise<Blob | null>
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function distance(
  first: { x: number; y: number },
  second: { x: number; y: number },
) {
  return Math.hypot(first.x - second.x, first.y - second.y)
}

export const ImageCropper = forwardRef<ImageCropperHandle, { currentUrl: string | null }>(
  function ImageCropper({ currentUrl }, ref) {
    const [localUrl, setLocalUrl] = useState<string | null>(null)
    const [zoom, setZoom] = useState(1)
    const [position, setPosition] = useState({ x: 0, y: 0 })
    const pointersRef = useRef(new Map<number, { x: number; y: number }>())
    const pinchDistanceRef = useRef<number | null>(null)
    const frameRef = useRef<HTMLDivElement | null>(null)
    const imageRef = useRef<HTMLImageElement | null>(null)
    const objectUrlRef = useRef<string | null>(null)

    useEffect(() => {
      return () => {
        if (objectUrlRef.current) {
          URL.revokeObjectURL(objectUrlRef.current)
        }
      }
    }, [])

    const resetCrop = () => {
      setZoom(1)
      setPosition({ x: 0, y: 0 })
      pinchDistanceRef.current = null
      pointersRef.current.clear()
    }

    const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]

      if (!file) {
        return
      }

      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current)
      }

      const nextUrl = URL.createObjectURL(file)
      objectUrlRef.current = nextUrl
      setLocalUrl(nextUrl)
      resetCrop()
    }

    const getCroppedImage = useCallback(async (): Promise<Blob | null> => {
      const image = imageRef.current
      const frame = frameRef.current

      if (!localUrl || !image || !frame) {
        return null
      }

      const frameWidth = frame.clientWidth
      const frameHeight = frame.clientHeight
      const naturalWidth = image.naturalWidth
      const naturalHeight = image.naturalHeight
      const coverScale = Math.max(frameWidth / naturalWidth, frameHeight / naturalHeight)
      const drawScale = coverScale * zoom
      const sourceWidth = Math.min(naturalWidth, frameWidth / drawScale)
      const sourceHeight = Math.min(naturalHeight, frameHeight / drawScale)
      const sourceX = clamp(
        naturalWidth / 2 - sourceWidth / 2 - position.x / drawScale,
        0,
        naturalWidth - sourceWidth,
      )
      const sourceY = clamp(
        naturalHeight / 2 - sourceHeight / 2 - position.y / drawScale,
        0,
        naturalHeight - sourceHeight,
      )
      const canvas = document.createElement('canvas')
      canvas.width = 800
      canvas.height = 1000
      const context = canvas.getContext('2d')

      if (!context) {
        return null
      }

      context.drawImage(
        image,
        sourceX,
        sourceY,
        sourceWidth,
        sourceHeight,
        0,
        0,
        canvas.width,
        canvas.height,
      )

      return new Promise((resolve, reject) => {
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob)
            } else {
              reject(new Error('Image crop failed'))
            }
          },
          'image/jpeg',
          0.9,
        )
      })
    }, [localUrl, position.x, position.y, zoom])

    useImperativeHandle(ref, () => ({ getCroppedImage }), [getCroppedImage])

    const handleWheel = (event: ReactWheelEvent<HTMLDivElement>) => {
      if (!localUrl) {
        return
      }

      event.preventDefault()
      const direction = event.deltaY > 0 ? -0.08 : 0.08
      setZoom((current) => clamp(current + direction, 1, 3))
    }

    const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!localUrl) {
        return
      }

      event.currentTarget.setPointerCapture(event.pointerId)
      pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
    }

    const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!localUrl || !pointersRef.current.has(event.pointerId)) {
        return
      }

      const previous = pointersRef.current.get(event.pointerId)
      pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
      const pointers = [...pointersRef.current.values()]

      if (pointers.length >= 2) {
        const nextDistance = distance(pointers[0], pointers[1])
        const previousDistance = pinchDistanceRef.current ?? nextDistance
        const delta = (nextDistance - previousDistance) / 180
        setZoom((current) => clamp(current + delta, 1, 3))
        pinchDistanceRef.current = nextDistance
        return
      }

      pinchDistanceRef.current = null

      if (previous) {
        setPosition((current) => ({
          x: current.x + event.clientX - previous.x,
          y: current.y + event.clientY - previous.y,
        }))
      }
    }

    const handlePointerEnd = (event: ReactPointerEvent<HTMLDivElement>) => {
      if (pointersRef.current.has(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId)
        pointersRef.current.delete(event.pointerId)
      }

      if (pointersRef.current.size < 2) {
        pinchDistanceRef.current = null
      }
    }

    const displayUrl = localUrl ?? currentUrl

    return (
      <section className="rounded-md border border-neutral-300 bg-neutral-50 p-3">
        <div
          ref={frameRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerEnd}
          onPointerCancel={handlePointerEnd}
          onWheel={handleWheel}
          className={`relative aspect-[4/5] overflow-hidden rounded-md border border-neutral-300 bg-neutral-200 ${
            localUrl ? 'cursor-grab touch-none active:cursor-grabbing' : ''
          }`}
        >
          {displayUrl ? (
            <img
              ref={imageRef}
              src={displayUrl}
              alt=""
              className="absolute left-1/2 top-1/2 h-full w-full max-w-none select-none object-cover"
              draggable={false}
              style={{
                transform: `translate(-50%, -50%) translate(${position.x}px, ${position.y}px) scale(${zoom})`,
              }}
            />
          ) : (
            <div className="grid h-full place-items-center text-center text-sm font-medium text-neutral-500">
              <div>
                <ImagePlus className="mx-auto mb-2" size={24} />
                Обери фото страви
              </div>
            </div>
          )}
          {localUrl && (
            <div className="absolute left-3 top-3 flex items-center gap-2 rounded-md bg-white/90 px-2 py-1 text-xs font-semibold text-neutral-700">
              <Move size={14} />
              Тягни фото, крути колесо або pinch
            </div>
          )}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <label className="flex h-10 cursor-pointer items-center gap-2 rounded-md border border-neutral-300 bg-white px-3 text-sm font-semibold text-neutral-900">
            <Upload size={16} />
            Завантажити фото
            <input
              className="hidden"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={handleFileChange}
            />
          </label>
          <button
            type="button"
            onClick={resetCrop}
            className="flex h-10 items-center gap-2 rounded-md border border-neutral-300 bg-white px-3 text-sm font-medium"
          >
            <RotateCcw size={16} />
            Центр
          </button>
        </div>
      </section>
    )
  },
)
