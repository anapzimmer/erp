type ClienteTabela = { nome: string; grupo_preco_id?: string | null };
const nomeNormalizado = (nome: string) => nome.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().replace(/\s+/g, " ").toLocaleLowerCase("pt-BR");

/** undefined exige escolha; null indica cliente único vinculado à tabela padrão. */
export function identificarTabelaCliente(clientes: ClienteTabela[], nome: string): string | null | undefined {
  const busca = nomeNormalizado(nome);
  if (!busca) return undefined;
  const encontrados = clientes.filter(c => nomeNormalizado(c.nome) === busca);
  if (encontrados.length !== 1) return undefined;
  return encontrados[0].grupo_preco_id || null;
}
