"use client";

import { AlertTriangle, CheckCircle2, Trash2, X } from "lucide-react";

type AvisoModalData = {
  titulo: string;
  mensagem: string;
  confirmar?: () => void;
  tipo?: "sucesso" | "erro" | "aviso";
  labelConfirmar?: string;
  labelCancelar?: string;
};

type CadastrosAvisoModalProps = {
  aviso: AvisoModalData | null;
  onClose: () => void;
  colors?: {
    bg?: string;
    text?: string;
    primaryButtonBg?: string;
    primaryButtonText?: string;
    success?: string;
    error?: string;
    warning?: string;
  };
};

export default function CadastrosAvisoModal({ aviso, onClose }: CadastrosAvisoModalProps) {
  if (!aviso) return null;

  const bg = "var(--surface)";
  const text = "var(--text-primary)";
  const success = "var(--success)";
  const error = "var(--danger)";
  const warning = "var(--warning)";
  const primaryButtonBg = "var(--primary)";
  const primaryButtonText = "var(--on-primary)";

  const iconColor = aviso.tipo === "sucesso" ? success
    : aviso.tipo === "aviso" ? warning
    : aviso.confirmar ? error
    : warning;
  const Icon = aviso.tipo === "sucesso"
    ? CheckCircle2
    : aviso.tipo === "aviso"
      ? AlertTriangle
      : aviso.confirmar
        ? Trash2
        : AlertTriangle;
  const confirmButtonDanger = aviso.tipo === "erro" || Boolean(aviso.confirmar);

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-navigation/20 px-4 py-6 backdrop-blur-[2px] animate-fade-in">
      <div
        className="w-full max-w-md overflow-hidden rounded-[20px] border border-border shadow-[0_18px_54px_var(--shadow)]"
        style={{ backgroundColor: bg }}
      >
        <div className="relative flex flex-col items-center justify-center gap-3 border-b border-border px-6 pb-5 pt-6 text-center">
          <div className="flex min-w-0 flex-col items-center gap-3 text-center">
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border"
              style={{ backgroundColor: `color-mix(in srgb, ${iconColor} 7%, transparent)`, borderColor: `color-mix(in srgb, ${iconColor} 13%, transparent)` }}
            >
              <Icon size={20} strokeWidth={1.9} style={{ color: iconColor }} />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-semibold leading-6" style={{ color: text }}>
                {aviso.titulo}
              </h2>
              <p className="mt-1 whitespace-pre-line text-sm leading-6 text-text-secondary">
                {aviso.mensagem}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-transparent text-text-secondary transition hover:bg-surface-secondary hover:text-text-secondary"
            title="Fechar"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex justify-center gap-2 px-5 py-4">
          {aviso.confirmar ? (
            <>
              <button
                onClick={onClose}
                className="rounded-xl border border-border bg-surface px-4 py-2.5 text-sm font-medium text-text-secondary transition hover:bg-surface-secondary"
              >
                {aviso.labelCancelar ?? "Cancelar"}
              </button>
              <button
                onClick={() => {
                  aviso.confirmar?.();
                  onClose();
                }}
                className="rounded-xl border bg-surface px-4 py-2.5 text-sm font-medium transition hover:bg-surface-secondary active:scale-[0.98]"
                style={{
                  borderColor: confirmButtonDanger ? "var(--danger-soft)" : "var(--border)",
                  color: confirmButtonDanger ? error : text,
                }}
              >
                {aviso.labelConfirmar ?? "Confirmar"}
              </button>
            </>
          ) : (
            <button
              onClick={onClose}
              className="rounded-xl px-5 py-2.5 text-sm font-semibold transition hover:brightness-95 active:scale-[0.98]"
              style={{ backgroundColor: primaryButtonBg, color: primaryButtonText }}
            >
              Entendido
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
