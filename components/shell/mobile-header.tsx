"use client"

import * as React from "react"
import { RediBrand } from "@/components/brand/redi-brand"
import { Badge } from "@/components/ui/badge"
import { Shield } from "lucide-react"

export function MobileHeader() {
  return (
    <header className="sticky top-0 z-40 flex h-14 w-full items-center justify-between border-b border-border/60 bg-background/90 px-4 backdrop-blur-md sm:hidden">
      <RediBrand size="sm" />
      <Badge
        variant="lavender"
        className="flex items-center gap-1 py-0.5 px-2 text-[10px] font-normal"
      >
        <Shield className="size-3 text-primary" />
        <span>Private</span>
      </Badge>
    </header>
  )
}
