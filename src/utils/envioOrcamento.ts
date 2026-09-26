export const SOLICITAR_ENVIO_ORCAMENTO = "glasscode:solicitar-envio-orcamento";
export type ItemEnvioOrcamento = { cliente?: string; obra?: string };
export type PedidoEnvioOrcamento = {
  itens: ItemEnvioOrcamento[];
  concluir: (resultado: { obra?: string } | null) => void;
};
let aguardando = false;

export async function confirmarEnvioOrcamento(itens: ItemEnvioOrcamento[]): Promise<boolean> {
  const params = new URLSearchParams(window.location.search);
  if (params.has("centralItem") || params.has("loteId")) return true;
  if (aguardando) return false;
  aguardando = true;
  try {
    const resultado = await new Promise<{ obra?: string } | null>(resolve => {
      const evento = new CustomEvent<PedidoEnvioOrcamento>(SOLICITAR_ENVIO_ORCAMENTO, {
        cancelable: true, detail: { itens, concluir: resolve },
      });
      if (window.dispatchEvent(evento)) resolve(null);
    });
    if (!resultado) return false;
    if (resultado.obra !== undefined) {
      itens.forEach(item => { item.obra = resultado.obra; });
      window.localStorage.setItem("glasscode:central-impressao:obra", resultado.obra);
    }
    return true;
  } finally { aguardando = false; }
}
