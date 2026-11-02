
"use client";

import { Check } from "lucide-react";

export default function CarregamentoAcesso({
  sucesso = false,
}: {
  sucesso?: boolean;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="text-center" role="status" aria-live="polite">
        <div
          aria-hidden="true"
          className="relative mx-auto flex h-16 w-16 items-center justify-center"
        >
          <span
            className={
              sucesso
                ? "absolute inset-0 rounded-full border-2 border-primary bg-primary/15"
                : "absolute inset-0 rounded-full border-2 border-border border-t-primary motion-safe:animate-spin"
            }
          />

          {sucesso && (
            <Check
              size={28}
              strokeWidth={1.8}
              className="relative text-text-primary"
            />
          )}
        </div>

        <p className="mt-5 text-sm font-medium text-text-primary">
          {sucesso ? "Acesso confirmado" : "Verificando sua conta…"}
        </p>

        <p className="mt-2 text-xs text-text-secondary">
          {sucesso
            ? "Abrindo seu espaço de trabalho."
            : "Preparando seu espaço de trabalho."}
        </p>
      </div>
    </main>
  );
}
