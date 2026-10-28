import { calcularConjuntoBox2Folhas } from './box2Folhas';

export type UnidadeParaVinculo = Readonly<{
  id: string;
  empresa_id: string;
  pedido_id: string;
  projeto_id: string;
  origem_campo: string;
  origem_linha_id: string;
  numero_unidade: number;
  largura_original_mm: number | null;
  altura_original_mm: number | null;
  situacao: string;
}>;

/** Somente proposta em memória. Não cria IDs, não grava e não altera situações.
 * As linhas fixo/móvel devem ser identificadas e validadas no snapshot de origem.
 * Nunca deduz o número de conjuntos pela área ou pela ordem de retorno da API.
 */
export function planejarConjuntosBox2(
  projeto: Readonly<{
    empresaId: string; pedidoId: string; projetoId: string;
    origemCampo: 'documentoPdfCompleto' | 'projetosPdf';
    quantidade: number; largura: number; altura: number;
    trilho: 'Padrão' | 'Até o teto';
    linhaFixoId: string; linhaMovelId: string;
  }>,
  unidades: readonly UnidadeParaVinculo[],
) {
  if (!Number.isSafeInteger(projeto.quantidade) || projeto.quantidade < 1) {
    throw new Error('Quantidade de conjuntos inválida. Não utilizar metragem comercial.');
  }
  if (![projeto.empresaId, projeto.pedidoId, projeto.projetoId, projeto.linhaFixoId, projeto.linhaMovelId]
    .every(id => typeof id === 'string' && id.trim().length > 0)
    || projeto.linhaFixoId === projeto.linhaMovelId) {
    throw new Error('Identidades do projeto e das duas linhas precisam ser confirmadas.');
  }
  const selecionadas = unidades.filter(u => u.empresa_id === projeto.empresaId
    && u.pedido_id === projeto.pedidoId && u.projeto_id === projeto.projetoId);
  if (selecionadas.length !== projeto.quantidade * 2
    || new Set(selecionadas.map(u => u.id)).size !== selecionadas.length) {
    throw new Error('Quantidade ou identidade das peças diverge do projeto. Revisão manual necessária.');
  }
  const calculo = calcularConjuntoBox2Folhas(projeto);
  const porNumero = new Map<number, Map<string, UnidadeParaVinculo>>();
  for (const u of selecionadas) {
    if (!u.id || u.origem_campo !== projeto.origemCampo || u.situacao !== 'pendente'
      || !Number.isSafeInteger(u.numero_unidade) || u.numero_unidade < 1 || u.numero_unidade > projeto.quantidade) {
      throw new Error('Peça com origem, situação ou numeração incompatível. Não vincular automaticamente.');
    }
    const papel = u.origem_linha_id === projeto.linhaFixoId ? 'fixo'
      : u.origem_linha_id === projeto.linhaMovelId ? 'movel' : null;
    if (!papel) throw new Error('Linha de origem não reconhecida. Não inferir pelo texto da descrição.');
    const esperada = calculo.pecas.find(p => p.tipo === papel)!;
    if (u.largura_original_mm !== esperada.fabricacao.largura || u.altura_original_mm !== esperada.fabricacao.altura) {
      throw new Error('Medida salva diverge do motor atual. Preservar peças e validar a regra.');
    }
    const grupo = porNumero.get(u.numero_unidade) ?? new Map<string, UnidadeParaVinculo>();
    if (grupo.has(papel)) throw new Error('Papel duplicado no mesmo conjunto.');
    grupo.set(papel, u);
    porNumero.set(u.numero_unidade, grupo);
  }
  return Array.from({ length: projeto.quantidade }, (_, indice) => {
    const numero = indice + 1;
    const grupo = porNumero.get(numero);
    if (!grupo?.has('fixo') || !grupo.has('movel')) throw new Error('Conjunto incompleto.');
    return {
      empresaId: projeto.empresaId, pedidoId: projeto.pedidoId, projetoId: projeto.projetoId,
      numeroConjunto: numero, origemCampo: projeto.origemCampo,
      larguraOriginalMm: projeto.largura, alturaOriginalMm: projeto.altura,
      configuracaoOriginal: { trilho: projeto.trilho }, motorVersao: 'box2folhas-v1',
      vinculos: (['fixo', 'movel'] as const).map(papel => ({ papel, unidadeId: grupo.get(papel)!.id })),
    };
  });
}
