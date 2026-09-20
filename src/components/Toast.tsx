"use client"

import { CheckCircle, X } from "lucide-react"
import { useEffect, useState } from "react"

export default function Toast({
  show,
  message,
  onClose
}: {
  show: boolean
  message: string
  onClose: () => void
}) {

  const [progress, setProgress] = useState(100)

  useEffect(() => {
    if (!show) return

    setProgress(100)

    const duration = 6000
    const interval = 100

    const step = 200 / (duration / interval)

    const timer = setInterval(() => {
      setProgress((p) => p - step)
    }, interval)

    const closeTimer = setTimeout(() => {
      onClose()
    }, duration)

    return () => {
      clearInterval(timer)
      clearTimeout(closeTimer)
    }

  }, [show, onClose])

  if (!show) return null

  return (
    <div className="fixed top-6 right-6 z-[9999] animate-in slide-in-from-right fade-in duration-300">

      <div className="relative overflow-hidden flex items-start gap-3 bg-surface/90 backdrop-blur-md border border-border shadow-2xl rounded-2xl px-5 py-4 min-w-[300px]">

        <CheckCircle className="text-success mt-[2px]" size={22} />

        <div className="flex-1">
          <p className="text-sm font-semibold text-text-primary">
            Sucesso
          </p>
          <p className="text-sm text-text-secondary">
            {message}
          </p>
        </div>

        <button
          onClick={onClose}
          className="text-text-secondary hover:text-text-secondary transition"
        >
          <X size={16} />
        </button>

        {/* Barra progresso */}
        <div className="absolute bottom-0 left-0 h-[3px] bg-success transition-all"
          style={{ width: `${progress}%` }}
        />

      </div>

    </div>
  )
}