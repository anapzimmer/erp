
type Registro = Record<string, unknown>;
const objeto = (v: unknown): Registro => v && typeof v === "object" && !Array.isArray(v) ? v as Registro : {};
const lista = (v: unknown): Registro[] => Array.isArray(v) ? v.map(objeto) : [];
const texto = (v: unknown) => typeof v === "string" || typeof v === "number" ? String(v) : "";
export type PedidoCompraOrigem = { id: string; numero: number; cliente: string; obra: string; situacao: string; itens: unknown; origem_snapshot: unknown };
export type NecessidadeCompra = { chave: string; projeto: string; descricao: string; quantidade: number; unidade: string; medida: string; cor: string };
/** Lê somente a versão aprovada: central e cálculo individual usam formatos diferentes. */
export function projetosPedido(snapshot: unknown): Registro[] {
  const raiz = objeto(snapshot), conteudo = objeto(raiz.itens);
  const central = conteudo.documentoPdfCompleto ?? conteudo.projetosPdf ?? conteudo.projetos ?? conteudo.itens ?? raiz.itens;
  if (Array.isArray(central)) return lista(central);
  const dados = objeto(conteudo.dados);
  if (Object.keys(dados).length && Array.isArray(conteudo.materiais)) {
    const puxador = dados.puxador === "Com puxador";
    const evidence = texto(dados.trinco).toLowerCase().includes("evidence");
    const desenhos: Record<string, string> = {
      box2fls: evidence ? (puxador ? "/desenhos/box-eleganceduplo.png" : "/desenhos/box-elegancesimples.png") : (puxador ? "/desenhos/box-padraopuxador.png" : "/desenhos/box-padrao.png"),
      boxcanto: puxador ? "/desenhos/box-canto4fpd.png" : "/desenhos/box-canto4f.png",
      boxcanto3f: puxador ? "/desenhos/box-canto3fcp.png" : "/desenhos/box-canto3f.png",
    };
    return [{
      ...dados,
      desenhoUrl: dados.desenhoUrl || desenhos[texto(conteudo.tipo)],
      materiais: conteudo.materiais,
      valorTotal: objeto(conteudo.resumo).valorTotal ?? raiz.valor_total,
    }];
  }
  const itemCentral = objeto(conteudo.itemCentral);
  if (Object.keys(itemCentral).length) return [itemCentral];
  return [];
}
export function necessidadesCompra(pedido: PedidoCompraOrigem) {
  const itens: NecessidadeCompra[] = [], avisos: string[] = [];
  if (["cancelado", "entregue"].includes(pedido.situacao)) return { itens, avisos };
  function adicionar(m: Registro, chave: string, projeto: string, cor = "") {
    if (m.tipo === "servico") return;
    const descricao = texto(m.vidroDescricao || m.vidro || m.descricao || m.nome);
    const quantidade = Number(m.qtd ?? m.quantidade);
    if (!descricao.trim() || !Number.isFinite(quantidade) || quantidade <= 0) {
      avisos.push(projeto + ": item sem descrição ou quantidade válida; conferir no pedido.");
      return;
    }
    const unidade = texto(m.unidade) || (m.tipo === "vidro" || m.vidro ? "peças" : "");
    if (!unidade) avisos.push(projeto + ": conferir a unidade de " + descricao + ".");
    itens.push({ chave, projeto, descricao, quantidade, unidade: unidade || "Conferir", medida: texto(m.medidaReal || m.medida || (m.largura && m.altura ? m.largura + " × " + m.altura + " mm" : "")), cor: texto(m.corSelecionada || m.cor || m.corMaterial) || cor });
  }
  if (!pedido.origem_snapshot) {
    lista(pedido.itens).forEach((m, i) => adicionar(m, pedido.id + ":manual:" + i, "Pedido manual"));
    return { itens, avisos };
  }
  const raiz = objeto(pedido.origem_snapshot), conteudo = objeto(raiz.itens);
  const projetos = projetosPedido(pedido.origem_snapshot);
  projetos.forEach((p, i) => {
    const nome = texto(p.projeto || p.descricao || p.nome) || "Projeto " + (i + 1);
    const materiais = lista(p.materiais), vidros = lista(p.vidrosAvulsos);
    // Materiais é a composição preservada; não multiplicar novamente pela quantidade de vãos.
    // Se as duas representações existem, não somar vidros sem confirmar que são linhas distintas.
    const origem = materiais.length ? materiais : vidros;
    origem.forEach((m, j) => adicionar(m, pedido.id + ":" + i + ":" + j, nome, texto(p.corKit)));
    if (materiais.length && vidros.length) avisos.push(nome + ": confira os vidros avulsos no pedido; foi usada somente a composição de materiais para evitar duplicação.");
    if (!origem.length) avisos.push(nome + ": composição não disponível. Conferir materiais e peças no pedido antes de comprar.");
  });
  if (!projetos.some(p => p.id === "materiais-avulsos")) lista(conteudo.materiaisAvulsos).forEach((m, i) => adicionar(m, pedido.id + ":avulso:" + i, "Materiais avulsos"));
  if (!itens.length && !avisos.length) avisos.push("Formato do pedido sem composição reconhecida. Conferir manualmente.");
  return { itens, avisos: [...new Set(avisos)] };
}
