type VidroRelatorio = {
  vidro: string;
  medida: string;
  precoVidroM2?: number;
  areaCobradaM2?: number;
  quantidade?: number;
};

type ContextoPreco = {
  origemTipo?: string;
  foraEsquadroPecas?: Array<{ area: number }>;
  itensOriginais?: Array<{ descricao?: string; medidaReal?: string; precoVidroM2?: number }>;
  espelhoItens?: Array<{ descricao?: string; medidas?: string; precoVidroM2?: number }>;
  materiais?: Array<{ descricao: string; unidade: string; valorUnitario: number }>;
};

const chave = (texto: string) => texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .toLowerCase().replace(/\bvidro\b/g, '').replace(/\s+/g, ' ').trim();

const precoValido = (valor: number | undefined) =>
  valor != null && Number.isFinite(valor) && valor >= 0;

export function obterPrecoVidroRelatorio(vidro: VidroRelatorio, contexto: ContextoPreco) {
  if (precoValido(vidro.precoVidroM2)) return { valor: vidro.precoVidroM2!, doItem: false };

  const originais = [
    ...(contexto.itensOriginais || []).map(item => ({ ...item, medida: item.medidaReal })),
    ...(contexto.espelhoItens || []).map(item => ({ ...item, medida: item.medidas })),
  ].filter(item => chave(item.descricao || '') === chave(vidro.vidro)
    && chave(item.medida || '') === chave(vidro.medida) && precoValido(item.precoVidroM2));
  const precos = [...new Set(originais.map(item => item.precoVidroM2!))];
  if (precos.length === 1) return { valor: precos[0], doItem: false };
  if (precos.length > 1) return null;

  // O material salvo pode incluir acabamentos: identifique-o como preço do item.
  const descricao = chave(`${vidro.medida} ${vidro.vidro}`);
  const materiais = (contexto.materiais || []).filter(item =>
    /^(m2|m²)$/i.test(item.unidade.trim()) && (chave(item.descricao) === descricao
      || (contexto.foraEsquadroPecas?.length && chave(item.descricao) === chave(`FORA DE ESQUADRO ${vidro.vidro}`)))
    && precoValido(item.valorUnitario));
  const valores = [...new Set(materiais.map(item => item.valorUnitario))];
  return valores.length === 1 ? { valor: valores[0], doItem: true } : null;
}

export function obterAreaCobradaVidro(vidro: VidroRelatorio, contexto: ContextoPreco, index: number) {
  if (vidro.areaCobradaM2 != null && Number.isFinite(vidro.areaCobradaM2) && vidro.areaCobradaM2 >= 0) {
    return vidro.areaCobradaM2;
  }
  const peca = contexto.foraEsquadroPecas?.[index];
  if (peca && Number.isFinite(peca.area) && peca.area > 0) return peca.area * Number(vidro.quantidade || 0);
  const medidas = vidro.medida.match(/\d+(?:[.,]\d+)?/g) || [];
  const [largura, altura] = medidas.map(valor => Number(valor.replace(',', '.')));
  return largura > 0 && altura > 0 ? largura * altura * Number(vidro.quantidade || 0) / 1_000_000 : 0;
}
