import * as React from "react"

export interface SettingsItemConfig {
  id: string
  title: string
  description?: string
  value?: React.ReactNode
  icon: React.ComponentType<{ className?: string }>
  iconColor?: string
  href?: string
  onClick?: () => void
  badge?: React.ReactNode
  toggle?: {
    checked: boolean
    onChange: (checked: boolean) => void
    disabled?: boolean
    ariaLabel?: string
  }
  destructive?: boolean
  disabled?: boolean
  external?: boolean
  hideChevron?: boolean
}

export interface SettingsSectionConfig {
  id: string
  title: string
  description?: string
  items: SettingsItemConfig[]
}
