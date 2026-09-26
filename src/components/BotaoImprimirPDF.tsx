"use client";

import { useRef, useState, type ComponentProps, type CSSProperties, type ReactNode } from "react";
import { pdf, PDFDownloadLink } from "@react-pdf/renderer";
import { Printer } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";

type Props = { documento: ComponentProps<typeof PDFDownloadLink>["document"]; arquivo: string; className?: string; style?: CSSProperties; rotulo?: string; icone?: ReactNode };

export default function BotaoImprimirPDF({ documento, arquivo, className, style, rotulo = "Imprimir", icone = <Printer size={17} /> }: Props) {
  const { isLoading } = useTheme();
  const emAndamento = useRef(false);
  const [gerando, setGerando] = useState(false);
  const [erro, setErro] = useState("");

  const imprimir = async () => {
    if (isLoading || emAndamento.current) return;
    emAndamento.current = true;
    setGerando(true);
    setErro("");
    try {
      const blob = await pdf(documento).toBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = arquivo;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch {
      setErro("Não foi possível gerar o PDF. Tente novamente.");
    } finally {
      emAndamento.current = false;
      setGerando(false);
    }
  };

  return <span className="relative inline-flex">
    <button type="button" className={className} style={style} disabled={isLoading || gerando} aria-busy={gerando}
      title={isLoading ? "Aguardando a logo da empresa" : gerando ? "Gerando PDF" : rotulo} onClick={() => void imprimir()}>
      {icone}{rotulo}
    </button>
    {gerando && <span role="status" className="absolute bottom-full right-0 mb-2 whitespace-nowrap rounded-lg border border-border bg-surface px-3 py-2 text-xs text-text-secondary shadow-sm">Gerando PDF…</span>}
    {erro && <span role="alert" className="absolute bottom-full right-0 mb-2 w-64 rounded-lg border border-border bg-surface p-3 text-xs text-danger shadow-sm">{erro}</span>}
  </span>;
}
