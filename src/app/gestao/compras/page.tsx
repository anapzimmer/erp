"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabaseClient";
import { necessidadesCompra, type PedidoCompraOrigem } from "@/utils/necessidadesCompra";
import styles from "../pedidos/pedidos.module.css";

export default function ComprasPage() {
  const { user, empresaId, nomeEmpresa, signOut } = useAuth();
  const [pedidos, setPedidos] = useState<PedidoCompraOrigem[]>([]);
  const [erro, setErro] = useState(""), [busca, setBusca] = useState("");
  const [carregando, setCarregando] = useState(true);
  const versao = useRef(0);
  const [empresaCarregada, setEmpresaCarregada] = useState<string | null>(null);
  const carregar = useCallback(async () => {
    const atual = ++versao.current;
    setPedidos([]); setErro(""); setCarregando(true);
    if (!empresaId) { setCarregando(false); return; }
    try {
      const permissao = await supabase.rpc("gc_meus_modulos");
      if (permissao.error) throw permissao.error;
      if (permissao.data?.gestao !== true) throw new Error("Módulo Gestão não liberado para esta empresa.");
      const todos: PedidoCompraOrigem[] = [];
      for (let inicio = 0; ; inicio += 100) {
        const { data, error } = await supabase.from("gc_pedidos")
          .select("id,numero,cliente,obra,situacao,itens,origem_snapshot")
          .eq("empresa_id", empresaId).not("situacao", "in", "(cancelado,entregue)")
          .order("numero", { ascending: false }).range(inicio, inicio + 99);
        if (atual !== versao.current) return;
        if (error) throw error;
        todos.push(...(data || []));
        if (!data || data.length < 100) break;
      }
      if (atual === versao.current) { setPedidos(todos); setEmpresaCarregada(empresaId); }
    } catch (e) { if (atual === versao.current) setErro(e instanceof Error ? e.message : "Não foi possível carregar as necessidades."); }
    finally { if (atual === versao.current) setCarregando(false); }
  }, [empresaId]);
  useEffect(() => { const controle = versao; const timer = setTimeout(() => void carregar(), 0); return () => { clearTimeout(timer); controle.current++; }; }, [carregar]);
  const visiveis = (empresaCarregada === empresaId ? pedidos : []).filter(p => (p.numero + " " + p.cliente + " " + p.obra).toLocaleLowerCase("pt-BR").includes(busca.toLocaleLowerCase("pt-BR")));
  return <div><Header nomeEmpresa={nomeEmpresa || ""} usuarioEmail={user?.email || ""} handleSignOut={signOut}/>
    <main className={styles.main}>
      <div className={styles.heading}><div><p className={styles.eyebrow}>GESTÃO · COMPRAS</p><h1>Compras</h1><p>Materiais dos pedidos ativos, organizados por cliente e obra.</p></div><button disabled={carregando} onClick={() => void carregar()}>Atualizar</button></div>
      <p className={styles.notice}>Ao aprovar um orçamento e criar o pedido, sua composição aparece aqui automaticamente. As quantidades ainda não descontam estoque. Confira medidas, unidades, cores e disponibilidade antes de comprar. Esta lista não emite compras nem envia solicitações a fornecedores.</p>
      <Link href="/gestao/pedidos">Abrir Gestão de Pedidos</Link>
      <div className={styles.form}><label>Buscar pedido, cliente ou obra<input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Número, cliente ou obra"/></label></div>
      {erro && <p role="alert" className={styles.notice}>{erro}</p>}
      {carregando && <p role="status">Carregando necessidades…</p>}
      {!carregando && !erro && !visiveis.length && <p>Nenhum pedido ativo encontrado.</p>}
      {!carregando && visiveis.map(p => {
        const resultado = necessidadesCompra(p);
        return <section key={p.id} className={styles.editor}>
          <h2>Pedido #{p.numero} · {p.cliente}</h2><p>{p.obra || "Obra não informada"} · {p.situacao === "conferencia" ? "Em conferência — revise antes de comprar" : p.situacao}</p>
          {resultado.avisos.map(a => <p className={styles.notice} key={a}>{a}</p>)}
          {resultado.itens.length > 0 && <div className={styles.scroll}><table><thead><tr><th>Projeto</th><th>Material / vidro</th><th>Medida</th><th>Cor do material</th><th>Quantidade</th><th>Unidade</th></tr></thead><tbody>
            {resultado.itens.map(i => <tr key={i.chave}><td>{i.projeto}</td><td>{i.descricao}</td><td>{i.medida || "Conferir"}</td><td>{i.cor || "Conferir"}</td><td>{i.quantidade.toLocaleString("pt-BR")}</td><td>{i.unidade}</td></tr>)}
          </tbody></table></div>}
        </section>;
      })}
    </main>
  </div>;
}
