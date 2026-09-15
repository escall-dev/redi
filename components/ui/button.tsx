import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center border border-transparent bg-clip-padding font-medium whitespace-nowrap transition-all duration-150 outline-none select-none cursor-pointer focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 active:scale-[0.98]",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground hover:bg-primary-hover shadow-xs",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-muted",
        soft:
          "bg-lavender text-lavender-foreground hover:bg-lavender/80 border border-lavender-border/60",
        pink:
          "bg-pink-accent text-pink-accent-foreground hover:bg-pink-accent/80 border border-pink-accent-border/60",
        outline:
          "border-border/80 bg-card hover:bg-secondary hover:text-foreground text-foreground shadow-xs",
        ghost:
          "hover:bg-secondary hover:text-foreground",
        destructive:
          "bg-destructive/10 text-destructive hover:bg-destructive/20 border border-destructive/20",
        link:
          "text-primary underline-offset-4 hover:underline active:scale-100",
      },
      size: {
        default:
          "h-11 sm:h-10 gap-2 px-4 text-sm rounded-xl",
        sm:
          "h-9 gap-1.5 px-3 text-xs rounded-lg",
        lg:
          "h-12 gap-2.5 px-6 text-base rounded-2xl",
        icon:
          "size-11 sm:size-10 rounded-xl",
        "icon-sm":
          "size-9 rounded-lg",
        "icon-xs":
          "size-7 rounded-md [&_svg:not([class*='size-'])]:size-3.5",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
