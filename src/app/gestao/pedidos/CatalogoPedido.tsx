"use client";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRegraMedidaVidro } from "@/context/RegraMedidaVidroContext";
import { localizarClientePorNome } from "@/utils/tabelaClienteOrcamento";
import { calcularItemCatalogo, nomeMaterialPedido, type MaterialPedido, type PrecoPedido, type TipoCatalogoPedido } from "@/utils/catalogoPedido";
import type { PedidoItem } from "@/utils/pedidos";
import styles from "./pedidos.module.css";
import { chapasDisponiveisVidro } from "@/utils/chapasVidro";



function normalizarBusca(valor: unknown) {
  return String(valor ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .trim();
}

function correspondeBusca(
  material: MaterialPedido,
  tipo: TipoCatalogoPedido,
  busca: string
) {
  const termos = normalizarBusca(busca).split(/\s+/).filter(Boolean);

  const texto = normalizarBusca([
    material.nome,
    material.codigo,
    material.cores,
    material.espessura,
    material.tipo,
    nomeMaterialPedido(material, tipo),
    tipo === "vidros" && material.espessura
      ? `${String(material.espessura).replace(/\s*mm$/i, "")}mm`
      : "",
  ].filter(Boolean).join(" "));

  return termos.every(termo => texto.includes(termo));
}


type Cliente = {
  id: string;
  nome: string;
  grupo_preco_id?: string | null;
};
// Paginação evita ocultar cadastros além do limite de resposta do Supabase.
async function listar<T>(tabela: string, empresa: string, campos: string): Promise<T[]> {
  const linhas: T[] = [];
  for (let inicio = 0; ; inicio += 500) {
    const { data, error } = await supabase.from(tabela).select(campos).eq("empresa_id", empresa).order("id").range(inicio, inicio + 499);
    if (error) {
      console.error("[CatalogoPedido] Erro ao consultar:", {
        tabela,
        empresa,
        campos,
        codigo: error.code,
        mensagem: error.message,
        detalhes: error.details,
        dica: error.hint,
      });

      throw new Error(
        `Erro ao carregar ${tabela}: ${error.message}`
      );
    }
    linhas.push(...(data as unknown as T[]));
    if (!data || data.length < 500) return linhas;
  }
}
export default function CatalogoPedido({ empresaId, cliente, setCliente, obra, setObra, adicionar, disabled, itemEdicao, cancelarEdicao }: {
  empresaId: string; cliente: string; setCliente: (nome: string) => void; obra: string; setObra: (nome: string) => void; adicionar: (item: PedidoItem) => void; disabled: boolean; itemEdicao?: PedidoItem; cancelarEdicao: () => void;
}) {
  const { regra } = useRegraMedidaVidro();
  const larguraInput = useRef<HTMLInputElement>(null);
  const [clientes, setClientes] = useState<Cliente[]>([]), [precos, setPrecos] = useState<PrecoPedido[]>([]);
  const [materiais, setMateriais] = useState<MaterialPedido[]>([]), [tipo, setTipo] = useState<TipoCatalogoPedido>((itemEdicao?.catalogo?.tipo as TipoCatalogoPedido) || "vidros");
  const [clienteId, setClienteId] = useState(""), [buscaCliente, setBuscaCliente] = useState("");
  const [id, setId] = useState(itemEdicao?.catalogo?.id || ""), [busca, setBusca] = useState("");
  const [largura, setLargura] = useState(String(itemEdicao?.largura || "")), [altura, setAltura] = useState(String(itemEdicao?.altura || "")), [quantidade, setQuantidade] = useState(String(itemEdicao?.quantidadeCortes || itemEdicao?.quantidade || 1)), [comprimento, setComprimento] = useState(String(itemEdicao?.comprimentoCorte || ""));
  const [erro, setErro] = useState(""), [basePronta, setBasePronta] = useState(false), [catalogoPronto, setCatalogoPronto] = useState(false), [tentativa, setTentativa] = useState(0);
  useEffect(() => {
    let ativo = true; setBasePronta(false); setClientes([]); setPrecos([]); setClienteId("");
    void Promise.all([listar<Cliente>("clientes", empresaId, "id,nome,grupo_preco_id"), listar<PrecoPedido>("vidro_precos_grupos", empresaId, "*")]).then(([c, p]) => {
      if (ativo) { setClientes(c.sort((a,b) => a.nome.localeCompare(b.nome, "pt-BR", { sensitivity: "base", numeric: true }) || String(a.id).localeCompare(String(b.id)))); setPrecos(p); setBasePronta(true); }
    }).catch(e => { if (ativo) setErro(e.message); });
    return () => { ativo = false; };
  }, [empresaId, tentativa]);
  useEffect(() => {
    let ativo = true; setCatalogoPronto(false); setMateriais([]); setErro("");
    void listar<MaterialPedido>(tipo, empresaId, "*").then(m => { if (ativo) { setMateriais(m.sort((a,b) => nomeMaterialPedido(a,tipo).localeCompare(nomeMaterialPedido(b,tipo), "pt-BR", { sensitivity: "base", numeric: true }))); setCatalogoPronto(true); } }).catch(e => { if (ativo) setErro(e.message); });
    return () => { ativo = false; };
  }, [empresaId, tipo, tentativa]);
  const escolhido = clientes.find(c => String(c.id) === clienteId && c.nome === cliente) ?? localizarClientePorNome(clientes, cliente);
  const ambiguo = !escolhido && clientes.some(c => c.nome === cliente);
  const material = materiais.find(m => String(m.id) === id);
  const chapas = tipo === "vidros" && material ? chapasDisponiveisVidro({ ...material, espessura: String(material.espessura ?? "") }) : [];
  const naoCabe = chapas.length > 0 && Number(largura) > 0 && Number(altura) > 0 && !chapas.some(c =>
    (Number(largura) <= c.largura_mm && Number(altura) <= c.altura_mm) ||
    (Number(altura) <= c.largura_mm && Number(largura) <= c.altura_mm));
  let calculado: PedidoItem | null = null, aviso = "";
  if (material && basePronta && catalogoPronto) {
    try {
      if (ambiguo) throw new Error("Selecione o cliente na lista para identificar a tabela correta.");
      calculado = calcularItemCatalogo({ material, tipo, quantidade: Number(quantidade), largura: Number(largura), altura: Number(altura), comprimento: Number(comprimento), grupo: escolhido?.grupo_preco_id, precos, regra });
    } catch (e) { aviso = (e as Error).message; }
  }
  function incluirMaterial() {
    if (!calculado || !escolhido || disabled || naoCabe) return;
    adicionar(calculado);
    if (tipo === "vidros") {
      setLargura("");
      setAltura("");
      setQuantidade("1");
      larguraInput.current?.focus();
    } else setId("");
  }
  return <fieldset disabled={disabled} className={styles.catalogo}>
    <legend>Dados do pedido</legend>
    {erro && <p role="alert">{erro} <button type="button" onClick={() => setTentativa(v => v + 1)}>Tentar novamente</button></p>}
    <div className={styles.catalogoCliente}>
      <label>Buscar cliente cadastrado<input value={buscaCliente} onChange={e => setBuscaCliente(e.target.value)} placeholder="Digite o nome" /></label>
      <label>Cliente · A–Z<select value={escolhido?.id ?? ""} onChange={e => { const c = clientes.find(c => String(c.id) === e.target.value); setClienteId(c ? String(c.id) : ""); setCliente(c?.nome ?? ""); }}><option value="">{basePronta ? "Selecione o cliente" : "Carregando clientes…"}</option>{clientes.filter(c => String(c.id) === String(escolhido?.id) || normalizarBusca(c.nome).includes(normalizarBusca(buscaCliente))).map(c => <option key={c.id} value={c.id}>{c.nome}{clientes.some(outro => outro.id !== c.id && outro.nome === c.nome) ? ` · ${String(c.id).slice(0,8)}` : ""}</option>)}</select></label>
      <label>Obra / referência<input value={obra} maxLength={200} placeholder="Opcional" onChange={e => setObra(e.target.value)} /></label>
    </div>
    {cliente && !escolhido && <p>Cliente do pedido: {cliente}. Selecione o cadastro correspondente para usar sua tabela de preços.</p>}
    <div className={styles.catalogoSecao}><h3>{itemEdicao ? "Editar material" : "Incluir material"}</h3><p>Selecione o cadastro, informe as medidas e confira o valor antes de adicionar.</p></div>
    <div className={styles.item}>
      <label>Tipo de material<select value={tipo} onChange={e => { setTipo(e.target.value as TipoCatalogoPedido); setId(""); setBusca(""); }}><option value="vidros">Vidros</option><option value="perfis">Perfis</option><option value="ferragens">Ferragens</option><option value="kits">Kits</option></select></label>
      <label>Buscar material ou cor<input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Nome, código ou cor" /></label>
      <label>Material cadastrado<select value={id} onChange={e => setId(e.target.value)}><option value="">{catalogoPronto ? "Selecione o material e a cor" : "Carregando materiais…"}</option>{materiais.filter(m =>
  String(m.id) === id ||
  correspondeBusca(m, tipo, busca)
).map(m => <option key={m.id} value={m.id}>{nomeMaterialPedido(m, tipo)}</option>)}</select></label>
      {tipo === "vidros" && <><label>Largura (mm)<input ref={larguraInput} type="text" inputMode="numeric" maxLength={4} value={largura} onChange={e => { if (/^\d{0,4}$/.test(e.target.value)) setLargura(e.target.value); }} /></label><label>Altura (mm)<input type="text" inputMode="numeric" maxLength={4} value={altura} onChange={e => { if (/^\d{0,4}$/.test(e.target.value)) setAltura(e.target.value); }} /></label></>}
      {tipo === "perfis" && <label>Comprimento de cada corte (mm)<input type="number" min="0" max="6000" placeholder="Vazio: comprar barras inteiras" value={comprimento} onChange={e => setComprimento(e.target.value)} /></label>}
      <label>{tipo === "perfis" ? (Number(comprimento) > 0 ? "Quantidade de cortes" : "Quantidade de barras") : "Quantidade de peças"}<input type="number" min="1" max="10000" step="1" value={quantidade} onChange={e => setQuantidade(e.target.value)} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); e.stopPropagation(); if (!e.repeat) incluirMaterial(); } }} /></label>
    </div>
    {!erro && (!basePronta || !catalogoPronto) && <p>Carregando cadastros e preços…</p>}
    {aviso && <p role="status">{aviso}</p>}
    {naoCabe && <p role="alert">Atenção: a peça não cabe em nenhuma chapa {material?.chapas?.length ? "cadastrada" : "de referência"} deste vidro, mesmo girando a peça. Medidas disponíveis: {chapas.map(c => `${c.largura_mm} × ${c.altura_mm} mm`).join("; ")}. Confirme a disponibilidade com o fornecedor antes de fechar o pedido. O acréscimo de preço não garante a disponibilidade da chapa.</p>}
    {calculado && <div className={styles.notice}><p>{calculado.catalogo?.memoria}</p><strong>{calculado.quantidade} {calculado.unidade} × {calculado.preco.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} = {(calculado.quantidade * calculado.preco).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</strong></div>}
    <button type="button" className={styles.primary} disabled={!calculado || !escolhido || disabled || naoCabe} onClick={incluirMaterial}>{itemEdicao ? "Atualizar item" : "Adicionar material ao pedido"}</button>{itemEdicao && <button type="button" onClick={cancelarEdicao}>Cancelar edição</button>}
    <p>Preços calculados pela tabela do cliente. Itens já adicionados mantêm seu valor; para recalcular, remova e inclua novamente.</p>
  </fieldset>;
}
