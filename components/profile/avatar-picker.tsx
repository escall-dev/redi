"use client"

import * as React from "react"
import { Avatar } from "@/components/ui/avatar"
import { validateAvatarFile } from "@/lib/avatars/image-upload"
import { ImageCropperDialog } from "@/components/profile/image-cropper-dialog"
import { Camera, Upload, AlertCircle, Trash2, Crop } from "lucide-react"
import { cn } from "@/lib/utils"

export interface AvatarPickerProps {
  value?: string | null
  displayName?: string
  onChange: (avatarUrl: string, file?: File | null) => Promise<void> | void
  disabled?: boolean
  className?: string
  inputName?: string
}

export function AvatarPicker({
  value,
  displayName = "User",
  onChange,
  disabled = false,
  className,
  inputName = "avatarUrl",
}: AvatarPickerProps) {
  // Disregard legacy preset strings
  const currentAvatar = value && !value.startsWith("preset:") ? value : ""
  const hasCustomPhoto = Boolean(currentAvatar && currentAvatar.length > 0)

  const [validationError, setValidationError] = React.useState<string | null>(null)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  // Cropper Dialog State
  const [isCropperOpen, setIsCropperOpen] = React.useState(false)
  const [pendingCropSrc, setPendingCropSrc] = React.useState<string | null>(null)
  const [pendingCropFileName, setPendingCropFileName] = React.useState<string>("avatar.jpg")

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValidationError(null)
    const file = e.target.files?.[0]
    if (!file) return

    // Strict Validation (JPG/JPEG, max 10MB)
    const validation = validateAvatarFile(file)
    if (!validation.valid) {
      setValidationError(validation.error || "Invalid image file.")
      e.target.value = ""
      return
    }

    // Load file for positioning/cropping
    const reader = new FileReader()
    reader.onerror = () => {
      setValidationError("Failed to read image file.")
    }
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setPendingCropSrc(reader.result)
        setPendingCropFileName(file.name)
        setIsCropperOpen(true)
      }
    }
    reader.readAsDataURL(file)

    // Reset input so re-selecting same file triggers change
    e.target.value = ""
  }

  const handleCropConfirm = async (croppedDataUrl: string, croppedFile: File) => {
    await onChange(croppedDataUrl, croppedFile)
    setIsCropperOpen(false)
    setPendingCropSrc(null)
  }

  const handleCropCancel = () => {
    setIsCropperOpen(false)
    setPendingCropSrc(null)
  }

  const handleRemovePhoto = async () => {
    setValidationError(null)
    await onChange("", null)
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Hidden input for standard HTML forms */}
      <input type="hidden" name={inputName} value={currentAvatar} />

      {/* Avatar Presentation Card */}
      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 p-4 rounded-2xl bg-lavender/30 dark:bg-card/40 border border-lavender-border/60 shadow-2xs">
        {/* Large Circular Avatar (Clickable to upload profile picture) */}
        <div className="relative group shrink-0">
          <button
            type="button"
            onClick={() => !disabled && fileInputRef.current?.click()}
            disabled={disabled}
            aria-label="Click to upload profile photo"
            className="relative rounded-full focus:outline-none focus-visible:ring-4 focus-visible:ring-primary/30 transition-all active:scale-95 cursor-pointer block"
          >
            <Avatar
              src={hasCustomPhoto ? currentAvatar : null}
              alt={displayName}
              fallbackInitials={displayName}
              size="2xl"
              className="ring-4 ring-background shadow-redi-card border-2 border-primary/20 text-2xl font-bold group-hover:opacity-90 transition-all"
            />

            {/* Hover Camera Overlay Icon */}
            <div className="absolute inset-0 rounded-full bg-black/25 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[0.5px]">
              <Camera className="size-7 text-white drop-shadow-md stroke-[2.2]" />
            </div>
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled}
            aria-label="Upload profile photo"
            className="absolute bottom-0 right-0 size-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md hover:bg-primary/90 transition-transform active:scale-90 focus:outline-none"
          >
            <Camera className="size-4 stroke-[2.2]" />
          </button>
        </div>

        {/* Info & Actions */}
        <div className="flex-1 text-center sm:text-left space-y-2">
          <div className="space-y-0.5">
            <div className="flex items-center justify-center sm:justify-start gap-2">
              <span className="text-sm font-semibold text-foreground">
                Profile Photo
              </span>
              {hasCustomPhoto ? (
                <span className="text-[10px] font-medium bg-primary/10 text-primary px-2 py-0.5 rounded-full border border-primary/20">
                  Custom Image
                </span>
              ) : (
                <span className="text-[10px] font-medium bg-secondary text-muted-foreground px-2 py-0.5 rounded-full border border-border/60">
                  Initials
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {hasCustomPhoto
                ? "Your custom profile picture is visible throughout the app."
                : "Upload a JPG/JPEG photo (max 10MB). When no photo is uploaded, your initials are shown."}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 shadow-2xs transition-all select-none active:scale-95"
            >
              <Upload className="size-3.5" />
              <span>{hasCustomPhoto ? "Change Photo" : "Upload Photo"}</span>
            </button>

            {hasCustomPhoto && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setPendingCropSrc(currentAvatar)
                    setPendingCropFileName("avatar.jpg")
                    setIsCropperOpen(true)
                  }}
                  disabled={disabled}
                  title="Adjust crop and position"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-background/80 hover:bg-background text-xs font-medium text-foreground border border-border/60 transition-all select-none active:scale-95"
                >
                  <Crop className="size-3.5" />
                  <span>Adjust Crop</span>
                </button>

                <button
                  type="button"
                  onClick={handleRemovePhoto}
                  disabled={disabled}
                  title="Remove photo and revert to initials"
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-destructive/10 hover:bg-destructive/15 text-xs font-medium text-destructive border border-destructive/20 transition-all select-none active:scale-95"
                >
                  <Trash2 className="size-3.5" />
                  <span>Remove</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Validation Error Alert */}
      {validationError && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-xl border border-destructive/20 bg-destructive/10 p-2.5 text-xs text-destructive animate-in fade-in duration-200"
        >
          <AlertCircle className="size-4 shrink-0 mt-0.5" />
          <span className="leading-snug">{validationError}</span>
        </div>
      )}

      {/* Hidden File Input strictly accepting JPEG/JPG */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".jpg,.jpeg,image/jpeg"
        onChange={handleFileChange}
        disabled={disabled}
        className="hidden"
        aria-label="Upload profile picture"
      />

      {/* Circular Cropping & Positioning Modal Dialog */}
      <ImageCropperDialog
        isOpen={isCropperOpen}
        imageSrc={pendingCropSrc}
        fileName={pendingCropFileName}
        onClose={handleCropCancel}
        onConfirm={handleCropConfirm}
      />
    </div>
  )
}
