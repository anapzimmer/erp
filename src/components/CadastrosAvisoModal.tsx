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

export default function CadastrosAvisoModal({ aviso, onClose, colors }: CadastrosAvisoModalProps) {
  if (!aviso) return null;

  const bg = colors?.bg || "#FFFFFF";
  const text = colors?.text || "#1f2937";
  const success = colors?.success || "#059669";
  const error = colors?.error || "#DC2626";
  const warning = colors?.warning || "#D97706";
  const primaryButtonBg = colors?.primaryButtonBg || "#334155";
  const primaryButtonText = colors?.primaryButtonText || "#FFFFFF";

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
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/20 px-4 py-6 backdrop-blur-[2px] animate-fade-in">
      <div
        className="w-full max-w-md overflow-hidden rounded-[20px] border border-slate-200 shadow-[0_18px_54px_rgba(15,23,42,0.14)]"
        style={{ backgroundColor: bg }}
      >
        <div className="relative flex flex-col items-center justify-center gap-3 border-b border-slate-100 px-6 pb-5 pt-6 text-center">
          <div className="flex min-w-0 flex-col items-center gap-3 text-center">
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border"
              style={{ backgroundColor: `${iconColor}12`, borderColor: `${iconColor}22` }}
            >
              <Icon size={20} strokeWidth={1.9} style={{ color: iconColor }} />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-semibold leading-6" style={{ color: text }}>
                {aviso.titulo}
              </h2>
              <p className="mt-1 whitespace-pre-line text-sm leading-6 text-slate-500">
                {aviso.mensagem}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-transparent text-slate-400 transition hover:bg-slate-50 hover:text-slate-600"
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
                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
              >
                {aviso.labelCancelar ?? "Cancelar"}
              </button>
              <button
                onClick={() => {
                  aviso.confirmar?.();
                  onClose();
                }}
                className="rounded-xl border bg-white px-4 py-2.5 text-sm font-medium transition hover:bg-slate-50 active:scale-[0.98]"
                style={{
                  borderColor: confirmButtonDanger ? "#fecaca" : "#cbd5e1",
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
