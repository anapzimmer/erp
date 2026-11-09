"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabaseClient";
import { type PedidoCompraOrigem } from "@/utils/necessidadesCompra";
import ControleCompras from "./ControleCompras";
import styles from "../pedidos/pedidos.module.css";

export default function ComprasPage() {
  const { user, empresaId, nomeEmpresa, signOut } = useAuth();
  const [pedidos, setPedidos] = useState<(PedidoCompraOrigem & {versao:number})[]>([]);
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
      const todos: (PedidoCompraOrigem & {versao:number})[] = [];
      for (let inicio = 0; ; inicio += 100) {
        const { data, error } = await supabase.from("gc_pedidos")
          .select("id,numero,cliente,obra,situacao,itens,origem_snapshot,versao")
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
      <p className={styles.notice}>Registre compras, acompanhe entregas parciais e consulte o histórico por fornecedor. Confira medidas, unidades e cores antes de comprar. As necessidades não descontam estoque.</p>
      <Link href="/gestao/pedidos">Abrir Gestão de Pedidos</Link>
      <div className={styles.form}><label>Buscar pedido, cliente ou obra<input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Número, cliente ou obra"/></label></div>
      {erro && <p role="alert" className={styles.notice}>{erro}</p>}
      {carregando && <p role="status">Carregando necessidades…</p>}
      {!carregando && !erro && !visiveis.length && <p>Nenhum pedido ativo encontrado.</p>}
      {!carregando && !erro && empresaId && empresaCarregada===empresaId && <ControleCompras key={empresaId} empresaId={empresaId} pedidos={pedidos} busca={busca} atualizar={()=>void carregar()}/>}
    </main>
  </div>;
}
