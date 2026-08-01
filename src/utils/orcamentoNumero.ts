export const prefixoNumeroOrcamento = (data = new Date()) => {
  const dia = data.getDate().toString().padStart(2, "0");
  const mes = (data.getMonth() + 1).toString().padStart(2, "0");
  return `OR${dia}${mes}`;
};

export async function gerarNumeroOrcamentoPadrao(supabase: any) {
  const prefixoData = prefixoNumeroOrcamento();

  const { data, error } = await supabase
    .from("orcamentos")
    .select("numero_formatado")
    .like("numero_formatado", `${prefixoData}%`);

  if (error) throw error;

  let maiorSequencia = 0;

  for (const orcamento of data || []) {
    const numero = String(orcamento.numero_formatado || "");
    const sequencia = Number.parseInt(numero.slice(prefixoData.length), 10);

    if (Number.isFinite(sequencia) && sequencia > maiorSequencia) {
      maiorSequencia = sequencia;
    }
  }

  return `${prefixoData}${(maiorSequencia + 1).toString().padStart(2, "0")}`;
}
