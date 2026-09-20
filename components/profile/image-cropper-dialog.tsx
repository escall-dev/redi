"use client"

import * as React from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ZoomIn, ZoomOut, RotateCcw, Move, Check, X, Loader2 } from "lucide-react"

export interface ImageCropperDialogProps {
  isOpen: boolean
  imageSrc: string | null
  fileName?: string
  onClose: () => void
  onConfirm: (croppedDataUrl: string, croppedFile: File) => Promise<void> | void
}

const CROP_VIEWPORT_SIZE = 260 // Diameter of circular crop area in pixels
const OUTPUT_SIZE = 512 // Resolution of the saved avatar image (512x512)

export function ImageCropperDialog({
  isOpen,
  imageSrc,
  fileName = "avatar.jpg",
  onClose,
  onConfirm,
}: ImageCropperDialogProps) {
  const [loadedImage, setLoadedImage] = React.useState<{ src: string; img: HTMLImageElement } | null>(null)
  const [zoom, setZoom] = React.useState<number>(1)
  const [offset, setOffset] = React.useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const [isSaving, setIsSaving] = React.useState(false)

  // Drag interaction tracking
  const [isDragging, setIsDragging] = React.useState(false)
  const dragStartRef = React.useRef<{ x: number; y: number }>({ x: 0, y: 0 })
  const initialOffsetRef = React.useRef<{ x: number; y: number }>({ x: 0, y: 0 })

  // Touch pinch zoom tracking
  const pinchDistRef = React.useRef<number | null>(null)
  const initialZoomRef = React.useRef<number>(1)

  // Load image when imageSrc changes (external system synchronization)
  React.useEffect(() => {
    if (!imageSrc) return
    let isCancelled = false
    const img = new Image()
    img.crossOrigin = "anonymous"
    img.onload = () => {
      if (!isCancelled) {
        setLoadedImage({ src: imageSrc, img })
        setZoom(1)
        setOffset({ x: 0, y: 0 })
      }
    }
    img.src = imageSrc
    return () => {
      isCancelled = true
    }
  }, [imageSrc])

  const image = loadedImage?.src === imageSrc ? loadedImage.img : null

  // Calculate base scale to ensure image completely fills circular viewport
  const baseScale = React.useMemo(() => {
    if (!image) return 1
    const minDimension = Math.min(image.naturalWidth, image.naturalHeight)
    return CROP_VIEWPORT_SIZE / minDimension
  }, [image])

  // Compute boundaries for panning so the crop circle is never empty
  const bounds = React.useMemo(() => {
    if (!image) return { minX: 0, maxX: 0, minY: 0, maxY: 0 }
    const currentScale = baseScale * zoom
    const renderedWidth = image.naturalWidth * currentScale
    const renderedHeight = image.naturalHeight * currentScale

    const maxOffsetX = Math.max(0, (renderedWidth - CROP_VIEWPORT_SIZE) / 2)
    const maxOffsetY = Math.max(0, (renderedHeight - CROP_VIEWPORT_SIZE) / 2)

    return {
      minX: -maxOffsetX,
      maxX: maxOffsetX,
      minY: -maxOffsetY,
      maxY: maxOffsetY,
    }
  }, [image, baseScale, zoom])

  // Derive clamped offset dynamically without extra render cycles
  const clampedOffset = React.useMemo(() => ({
    x: Math.min(bounds.maxX, Math.max(bounds.minX, offset.x)),
    y: Math.min(bounds.maxY, Math.max(bounds.minY, offset.y)),
  }), [bounds, offset.x, offset.y])

  // Mouse Drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    setIsDragging(true)
    dragStartRef.current = { x: e.clientX, y: e.clientY }
    initialOffsetRef.current = { ...clampedOffset }
  }

  const handleMouseMove = React.useCallback(
    (e: MouseEvent) => {
      if (!isDragging) return
      const dx = e.clientX - dragStartRef.current.x
      const dy = e.clientY - dragStartRef.current.y

      setOffset({
        x: initialOffsetRef.current.x + dx,
        y: initialOffsetRef.current.y + dy,
      })
    },
    [isDragging]
  )

  const handleMouseUp = React.useCallback(() => {
    setIsDragging(false)
  }, [])

  React.useEffect(() => {
    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove)
      window.addEventListener("mouseup", handleMouseUp)
      return () => {
        window.removeEventListener("mousemove", handleMouseMove)
        window.removeEventListener("mouseup", handleMouseUp)
      }
    }
  }, [isDragging, handleMouseMove, handleMouseUp])

  // Touch Drag & Pinch Zoom handlers (prevent accidental page scrolling)
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDragging(true)
      const touch = e.touches[0]
      dragStartRef.current = { x: touch.clientX, y: touch.clientY }
      initialOffsetRef.current = { ...offset }
      pinchDistRef.current = null
    } else if (e.touches.length === 2) {
      // 2-finger pinch
      setIsDragging(false)
      const t1 = e.touches[0]
      const t2 = e.touches[1]
      const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY)
      pinchDistRef.current = dist
      initialZoomRef.current = zoom
    }
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 1 && isDragging) {
      const touch = e.touches[0]
      const dx = touch.clientX - dragStartRef.current.x
      const dy = touch.clientY - dragStartRef.current.y

      setOffset({
        x: Math.min(bounds.maxX, Math.max(bounds.minX, initialOffsetRef.current.x + dx)),
        y: Math.min(bounds.maxY, Math.max(bounds.minY, initialOffsetRef.current.y + dy)),
      })
    } else if (e.touches.length === 2 && pinchDistRef.current !== null) {
      const t1 = e.touches[0]
      const t2 = e.touches[1]
      const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY)
      const scaleMultiplier = dist / pinchDistRef.current
      const newZoom = Math.min(3, Math.max(1, initialZoomRef.current * scaleMultiplier))
      setZoom(newZoom)
    }
  }

  const handleTouchEnd = () => {
    setIsDragging(false)
    pinchDistRef.current = null
  }

  // Wheel zoom handler
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? -0.1 : 0.1
    setZoom((prev) => Math.min(3, Math.max(1, Number((prev + delta).toFixed(2)))))
  }

  // Reset positioning & zoom
  const handleReset = () => {
    setZoom(1)
    setOffset({ x: 0, y: 0 })
  }

  // Perform final high-res crop onto 512x512 canvas
  const handleSave = async () => {
    if (!image) return
    setIsSaving(true)

    try {
      const currentScale = baseScale * zoom
      // Calculate center in natural image coordinates using clamped offset
      const centerX = image.naturalWidth / 2 - clampedOffset.x / currentScale
      const centerY = image.naturalHeight / 2 - clampedOffset.y / currentScale
      const cropRadiusInImg = (CROP_VIEWPORT_SIZE / 2) / currentScale
      const cropSizeInImg = cropRadiusInImg * 2

      const sourceX = centerX - cropRadiusInImg
      const sourceY = centerY - cropRadiusInImg

      const canvas = document.createElement("canvas")
      canvas.width = OUTPUT_SIZE
      canvas.height = OUTPUT_SIZE
      const ctx = canvas.getContext("2d")

      if (!ctx) {
        throw new Error("Unable to create canvas context")
      }

      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = "high"

      // Draw cropped square
      ctx.drawImage(
        image,
        sourceX,
        sourceY,
        cropSizeInImg,
        cropSizeInImg,
        0,
        0,
        OUTPUT_SIZE,
        OUTPUT_SIZE
      )

      const croppedDataUrl = canvas.toDataURL("image/jpeg", 0.9)

      const croppedBlob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (b) => {
            if (b) resolve(b)
            else reject(new Error("Canvas export failed"))
          },
          "image/jpeg",
          0.9
        )
      })

      const safeName = fileName.replace(/\.[^.]+$/, "") + "-cropped.jpg"
      const croppedFile = new File([croppedBlob], safeName, {
        type: "image/jpeg",
        lastModified: Date.now(),
      })

      await onConfirm(croppedDataUrl, croppedFile)
      onClose()
    } catch (err) {
      console.error("[ImageCropperDialog] Failed to save crop:", err)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !isSaving && onClose()}>
      <DialogContent
        showCloseButton={!isSaving}
        className="max-w-md p-5 sm:p-6 overflow-hidden rounded-3xl gap-5"
      >
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl font-semibold text-foreground">
            Crop Profile Picture
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm text-muted-foreground">
            Drag to reposition your photo and use the slider to zoom in or out.
          </DialogDescription>
        </DialogHeader>

        {/* Cropping Viewport Container */}
        <div className="flex flex-col items-center justify-center select-none py-1">
          <div
            className="relative overflow-hidden rounded-2xl bg-neutral-900 touch-none cursor-grab active:cursor-grabbing border border-border/70 shadow-inner flex items-center justify-center"
            style={{
              width: CROP_VIEWPORT_SIZE + 40,
              height: CROP_VIEWPORT_SIZE + 40,
            }}
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onWheel={handleWheel}
          >
            {/* Positioned and Scaled Image */}
            {image && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={image.src}
                alt="Crop subject"
                draggable={false}
                className="max-w-none pointer-events-none transition-transform duration-75"
                style={{
                  width: `${image.naturalWidth * baseScale * zoom}px`,
                  height: `${image.naturalHeight * baseScale * zoom}px`,
                  transform: `translate(${clampedOffset.x}px, ${clampedOffset.y}px)`,
                }}
              />
            )}

            {/* Circular Mask Overlay */}
            {/* The circular hole is completely clear while surrounding area is dimmed with 60% opacity */}
            <div
              className="absolute pointer-events-none rounded-full border-2 border-white shadow-2xl"
              style={{
                width: CROP_VIEWPORT_SIZE,
                height: CROP_VIEWPORT_SIZE,
                boxShadow: "0 0 0 9999px rgba(0, 0, 0, 0.58)",
              }}
            />

            {/* Subtle center guide icon shown briefly or subtle hint */}
            <div className="absolute top-2.5 right-2.5 flex items-center gap-1 rounded-full bg-black/60 px-2 py-1 text-[10px] text-white/90 backdrop-blur-xs pointer-events-none">
              <Move className="size-3" />
              <span>Drag to move</span>
            </div>
          </div>
        </div>

        {/* Zoom & Adjustment Controls */}
        <div className="space-y-3 px-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="font-medium text-foreground">Zoom Level</span>
            <div className="flex items-center gap-2">
              <span>{Math.round(zoom * 100)}%</span>
              {(zoom !== 1 || offset.x !== 0 || offset.y !== 0) && (
                <button
                  type="button"
                  onClick={handleReset}
                  disabled={isSaving}
                  className="flex items-center gap-1 text-[11px] text-primary hover:underline"
                >
                  <RotateCcw className="size-3" />
                  <span>Reset</span>
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setZoom((prev) => Math.max(1, Number((prev - 0.2).toFixed(2))))}
              disabled={zoom <= 1 || isSaving}
              aria-label="Zoom out"
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary disabled:opacity-30 transition-colors"
            >
              <ZoomOut className="size-4" />
            </button>

            <input
              type="range"
              min="1"
              max="3"
              step="0.02"
              value={zoom}
              onChange={(e) => setZoom(parseFloat(e.target.value))}
              disabled={isSaving}
              aria-label="Avatar zoom slider"
              className="w-full h-1.5 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary focus:outline-none"
            />

            <button
              type="button"
              onClick={() => setZoom((prev) => Math.min(3, Number((prev + 0.2).toFixed(2))))}
              disabled={zoom >= 3 || isSaving}
              aria-label="Zoom in"
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary disabled:opacity-30 transition-colors"
            >
              <ZoomIn className="size-4" />
            </button>
          </div>
        </div>

        {/* Actions: Cancel and Save Changes */}
        <DialogFooter className="flex flex-row items-center justify-end gap-2 pt-1 sm:pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isSaving}
            className="flex-1 sm:flex-initial h-10 rounded-xl"
          >
            <X className="size-4 mr-1.5" />
            Cancel
          </Button>

          <Button
            type="button"
            onClick={handleSave}
            disabled={isSaving || !image}
            className="flex-1 sm:flex-initial h-10 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 shadow-redi-sm"
          >
            {isSaving ? (
              <>
                <Loader2 className="size-4 animate-spin mr-1.5" />
                Saving...
              </>
            ) : (
              <>
                <Check className="size-4 mr-1.5" />
                Save Changes
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
