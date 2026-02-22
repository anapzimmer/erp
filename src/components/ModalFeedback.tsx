"use client";

import { Check, AlertCircle, Info, X } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";

interface ModalFeedbackProps {
  isOpen: boolean;
  onClose: () => void;
  tipo: "sucesso" | "erro" | "aviso";
  titulo: string;
  mensagem: string;
}

export default function ModalFeedback({ isOpen, onClose, tipo, titulo, mensagem }: ModalFeedbackProps) {
  const { theme } = useTheme();

  if (!isOpen) return null;

  const config = {
    sucesso: {
      icone: <Check size={24} style={{ color: theme.modalIconSuccessColor }} />,
      fundoIcone: `${theme.modalIconSuccessColor}10`, // Mais suave (10% de opacidade)
    },
    erro: {
      icone: <AlertCircle size={24} style={{ color: theme.modalIconErrorColor }} />,
      fundoIcone: `${theme.modalIconErrorColor}10`,
    },
    aviso: {
      icone: <Info size={24} style={{ color: theme.modalIconWarningColor }} />,
      fundoIcone: `${theme.modalIconWarningColor}10`,
    },
  };

  const current = config[tipo];

  return (
    <div className="fixed inset-0 bg-gray-900/20 backdrop-blur-[2px] z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300">
      <div 
        className="w-full max-w-[340px] rounded-[2rem] p-8 shadow-[0_20px_50px_rgba(0,0,0,0.1)] text-center relative animate-in zoom-in-95 slide-in-from-bottom-4 duration-500 ease-out"
        style={{ backgroundColor: theme.modalBackgroundColor }}
      >
        {/* Botão de fechar discreto */}
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 opacity-30 hover:opacity-100 transition-all"
          style={{ color: theme.modalTextColor }}
        >
          <X size={18} strokeWidth={1.5} />
        </button>

        {/* Círculo do Ícone mais contido e elegante */}
        <div 
          className="mx-auto w-14 h-14 rounded-2xl flex items-center justify-center mb-6"
          style={{ backgroundColor: current.fundoIcone }}
        >
          {current.icone}
        </div>

        {/* Textos com pesos variados */}
        <div className="space-y-3 mb-8">
          <h3 className="text-xl font-semibold tracking-tight" style={{ color: theme.modalTextColor }}>
            {titulo}
          </h3>
          <p className="text-[13px] leading-relaxed opacity-60" style={{ color: theme.modalTextColor }}>
            {mensagem}
          </p>
        </div>

        {/* Botão com design "Pill" e sombra suave */}
        <button
          onClick={onClose}
          className="w-full font-bold py-3.5 rounded-xl transition-all hover:brightness-110 active:scale-[0.98] shadow-sm tracking-wide text-xs uppercase"
          style={{ 
            backgroundColor: theme.modalButtonBackgroundColor, 
            color: theme.modalButtonTextColor 
          }}
        >
          Confirmar
        </button>
      </div>
    </div>
  );
}