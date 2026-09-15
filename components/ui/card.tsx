import * as React from "react"
import { cn } from "@/lib/utils"

interface CardProps extends React.ComponentProps<"div"> {
  size?: "default" | "sm"
  interactive?: boolean
}

function Card({
  className,
  size = "default",
  interactive = false,
  ...props
}: CardProps) {
  return (
    <div
      data-slot="card"
      data-size={size}
      className={cn(
        "flex flex-col gap-4 overflow-hidden rounded-2xl border border-border/80 dark:border-border/60 bg-card p-5 sm:p-6 text-card-foreground shadow-redi-card transition-all duration-200",
        size === "sm" && "p-4 gap-3 rounded-xl",
        interactive && "hover:shadow-redi-card-hover hover:border-primary/40 cursor-pointer active:scale-[0.99]",
        className
      )}
      {...props}
    />
  )
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn("flex flex-col gap-1.5", className)}
      {...props}
    />
  )
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-title"
      className={cn(
        "text-lg font-semibold tracking-tight text-foreground sm:text-xl",
        className
      )}
      {...props}
    />
  )
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn("text-sm text-muted-foreground leading-relaxed", className)}
      {...props}
    />
  )
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn("flex flex-col gap-3", className)}
      {...props}
    />
  )
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn(
        "flex items-center gap-2 pt-2 border-t border-border/50",
        className
      )}
      {...props}
    />
  )
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
  CardContent,
}
