"use client";

import { memo, useEffect, useState } from "react";
import { pdf } from "@react-pdf/renderer";

type Props = {
  children: NonNullable<Parameters<typeof pdf>[0]>;
  nomeArquivo: string;
};

function OrcamentoPdfPreview({ children: documento, nomeArquivo }: Props) {
  const [url, setUrl] = useState<string | null>(null);
  const [erro, setErro] = useState(false);
  const [tentativa, setTentativa] = useState(0);

  useEffect(() => {
    let ativo = true;
    let objetoUrl: string | undefined;
    setUrl(null);
    setErro(false);
    void pdf(documento).toBlob().then(blob => {
      if (!ativo) return;
      objetoUrl = URL.createObjectURL(blob);
      setUrl(objetoUrl);
    }).catch(() => { if (ativo) setErro(true); });
    return () => {
      ativo = false;
      if (objetoUrl) URL.revokeObjectURL(objetoUrl);
    };
  }, [documento, tentativa]);

  return <div className="flex h-full min-h-0 flex-col">
    <div className="flex shrink-0 items-center justify-end border-b border-border bg-surface px-4 py-2">
      <button type="button" disabled={!url} onClick={() => {
        if (!url) return;
        const link = document.createElement("a");
        link.href = url;
        link.download = nomeArquivo.replace(/[<>:"/\\|?*]/g, "-");
        document.body.appendChild(link);
        link.click();
        link.remove();
      }} className="rounded-lg border border-border px-3 py-2 text-xs font-medium text-text-primary disabled:opacity-40">Baixar PDF</button>
    </div>
    {url ? <iframe title="Visualização do orçamento" src={`${url}#toolbar=0`} className="min-h-0 w-full flex-1 border-0" />
      : <div role="status" className="flex flex-1 items-center justify-center gap-3 text-sm text-text-secondary">
        {erro ? <>Não foi possível gerar o PDF.<button type="button" className="underline" onClick={() => setTentativa(t => t + 1)}>Tentar novamente</button></> : "Preparando visualização…"}
      </div>}
  </div>;
}

// The document components receive plain persisted data. Ignore parent/auth/theme
// refreshes that produce new references with identical report content.
export default memo(OrcamentoPdfPreview, (anterior, proximo) =>
  anterior.nomeArquivo === proximo.nomeArquivo &&
  anterior.children.type === proximo.children.type &&
  JSON.stringify(anterior.children.props) === JSON.stringify(proximo.children.props));
