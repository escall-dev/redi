/**
 * Client-side avatar image upload validation and processing utilities.
 * Enforces strict 10MB limit and JPEG/JPG formats.
 */

export const MAX_AVATAR_FILE_SIZE_BYTES = 10 * 1024 * 1024 // 10MB
export const ALLOWED_AVATAR_MIME_TYPES = ["image/jpeg", "image/jpg"]
export const ALLOWED_AVATAR_EXTENSIONS = [".jpg", ".jpeg"]

export interface ImageValidationResult {
  valid: boolean
  error?: string
}

/**
 * Validates file format and size strictly according to specs.
 */
export function validateAvatarFile(file: File): ImageValidationResult {
  if (!file) {
    return { valid: false, error: "No file was selected." }
  }

  // 1. Check file size (max 10MB)
  if (file.size > MAX_AVATAR_FILE_SIZE_BYTES) {
    const sizeInMb = (file.size / (1024 * 1024)).toFixed(1)
    return {
      valid: false,
      error: `File is too large (${sizeInMb}MB). Maximum allowed size is 10MB.`,
    }
  }

  // 2. Check MIME type strictly
  const mime = file.type.toLowerCase()
  const fileName = file.name.toLowerCase()
  const hasValidExtension = ALLOWED_AVATAR_EXTENSIONS.some((ext) =>
    fileName.endsWith(ext)
  )

  const hasValidMime =
    ALLOWED_AVATAR_MIME_TYPES.includes(mime) ||
    // Some browsers or OS might report empty or generic mime for renamed files, check extension
    (mime === "" && hasValidExtension)

  if (!hasValidMime || !hasValidExtension) {
    return {
      valid: false,
      error: "Only JPEG or JPG image formats are supported (.jpg, .jpeg).",
    }
  }

  return { valid: true }
}

export interface ProcessedAvatar {
  dataUrl: string
  blob: Blob
  file: File
}

/**
 * Crops the image into a centered square and resizes to maxDimension (default 512px)
 * for snappy load performance, crisp rendering, and bandwidth efficiency.
 */
export async function processAndCropAvatarImage(
  file: File,
  maxDimension: number = 512,
  quality: number = 0.88
): Promise<ProcessedAvatar> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onerror = () => {
      reject(new Error("Failed to read image file."))
    }

    reader.onload = () => {
      const img = new Image()
      img.onerror = () => {
        reject(new Error("Unable to decode the selected image."))
      }

      img.onload = () => {
        try {
          // Calculate square crop bounds (center crop)
          const naturalWidth = img.naturalWidth || img.width
          const naturalHeight = img.naturalHeight || img.height

          const minDim = Math.min(naturalWidth, naturalHeight)
          const sx = (naturalWidth - minDim) / 2
          const sy = (naturalHeight - minDim) / 2

          const targetSize = Math.min(minDim, maxDimension)

          const canvas = document.createElement("canvas")
          canvas.width = targetSize
          canvas.height = targetSize

          const ctx = canvas.getContext("2d")
          if (!ctx) {
            throw new Error("Canvas 2D context not available.")
          }

          // Smooth rendering
          ctx.imageSmoothingEnabled = true
          ctx.imageSmoothingQuality = "high"

          // Draw cropped & resized square
          ctx.drawImage(
            img,
            sx,
            sy,
            minDim,
            minDim,
            0,
            0,
            targetSize,
            targetSize
          )

          const dataUrl = canvas.toDataURL("image/jpeg", quality)

          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error("Failed to convert canvas to blob."))
                return
              }
              const processedFile = new File([blob], file.name.replace(/\.[^.]+$/, ".jpg"), {
                type: "image/jpeg",
                lastModified: Date.now(),
              })
              resolve({
                dataUrl,
                blob,
                file: processedFile,
              })
            },
            "image/jpeg",
            quality
          )
        } catch (err) {
          reject(err)
        }
      }

      img.src = reader.result as string
    }

    reader.readAsDataURL(file)
  })
}
