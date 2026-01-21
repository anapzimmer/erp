// src/components/ui/button.tsx
"use client"

import * as React from "react"

// Função utilitária opcional (caso não tenha o utils.ts ainda)
function cn(...classes: (string | undefined | boolean)[]) {
  return classes.filter(Boolean).join(" ")
}

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors",
        className
      )}
      {...props}
    />
  )
)

Button.displayName = "Button"
