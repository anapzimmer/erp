// src/components/ui/input.tsx
"use client"
import * as React from "react"

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={`border rounded-md p-2 text-sm ${className || ""}`}
      {...props}
    />
  )
)
Input.displayName = "Input"
