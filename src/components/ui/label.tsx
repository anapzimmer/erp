"use client"

import * as React from "react"

export interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {}

/**
 * Componente de Label padrão para formulários
 * Uso:
 *   <Label htmlFor="nome">Nome:</Label>
 */
export const Label = React.forwardRef<HTMLLabelElement, LabelProps>(
  ({ className, ...props }, ref) => (
    <label
      ref={ref}
      className={`block text-sm font-medium text-gray-700 ${className || ""}`}
      {...props}
    />
  )
)

Label.displayName = "Label"
