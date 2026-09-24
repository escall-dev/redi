"use client"

import * as React from "react"
import { useRouter as useNextRouter } from "next/navigation"
import { useNavigationLoading } from "./navigation-loading-context"

/**
 * Enhanced useRouter hook that automatically triggers navigation loading feedback
 * for programmatic transitions (push, replace) if the destination takes longer than 200ms.
 */
export function useAppRouter() {
  const router = useNextRouter()
  const { startLoading } = useNavigationLoading()

  const push = React.useCallback(
    (href: string, options?: Parameters<typeof router.push>[1]) => {
      startLoading(href)
      return router.push(href, options)
    },
    [router, startLoading]
  )

  const replace = React.useCallback(
    (href: string, options?: Parameters<typeof router.replace>[1]) => {
      startLoading(href)
      return router.replace(href, options)
    },
    [router, startLoading]
  )

  return {
    ...router,
    push,
    replace,
  }
}
