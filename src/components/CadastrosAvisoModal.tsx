"use client";

import { AlertTriangle, CheckCircle2, Trash2 } from "lucide-react";

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
  const text = colors?.text || "#1C415B";
  const success = colors?.success || "#059669";
  const error = colors?.error || "#DC2626";
  const warning = colors?.warning || "#D97706";
  const primaryButtonBg = colors?.primaryButtonBg || "#1C415B";
  const primaryButtonText = colors?.primaryButtonText || "#FFFFFF";

  const iconColor = aviso.tipo === "sucesso" ? success
    : aviso.tipo === "aviso" ? warning
    : aviso.confirmar ? error
    : warning;
  const Icon = aviso.tipo === "sucesso" ? CheckCircle2 : aviso.confirmar ? Trash2 : AlertTriangle;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/45 backdrop-blur-sm z-[70] px-4 animate-fade-in">
      <div
        className="rounded-3xl p-8 shadow-2xl w-full max-w-sm border border-white/20 flex flex-col items-center text-center"
        style={{ backgroundColor: bg }}
      >
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5"
          style={{ backgroundColor: `${iconColor}1A` }}
        >
          <Icon size={30} style={{ color: iconColor }} />
        </div>

        <h2 className="text-xl font-black mb-2" style={{ color: text }}>
          {aviso.titulo}
        </h2>

        <p className="text-gray-500 mb-8 text-sm whitespace-pre-line leading-relaxed px-2">
          {aviso.mensagem}
        </p>

        <div className="flex gap-3 w-full">
          {aviso.confirmar ? (
            <>
              <button
                onClick={onClose}
                className="flex-1 py-3 rounded-2xl text-xs font-bold bg-gray-100 text-gray-600 hover:bg-gray-200 transition-all"
              >
                {aviso.labelCancelar ?? "Cancelar"}
              </button>
              <button
                onClick={() => {
                  aviso.confirmar?.();
                  onClose();
                }}
                className="flex-1 py-3 rounded-2xl text-xs font-bold text-white shadow-md active:scale-95 transition-all"
                style={{ backgroundColor: error }}
              >
                {aviso.labelConfirmar ?? "Confirmar"}
              </button>
            </>
          ) : (
            <button
              onClick={onClose}
              className="w-full py-3 rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg transition-all active:scale-95"
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
