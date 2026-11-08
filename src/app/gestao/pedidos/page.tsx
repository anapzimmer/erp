"use client";

import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import Link from "next/link";
import { Pencil, Trash2 } from "lucide-react";
import EditarMedidasPedido from "./EditarMedidasPedido";
import CatalogoPedido from "./CatalogoPedido";
import {lerRevisaoCalculo} from "@/utils/revisaoCalculoPedido";
import RevisaoPedido from "./RevisaoPedido";
import PreviaOrcamento from "./PreviaOrcamento";
import FinanceiroPedido from "./FinanceiroPedido";
import RelatorioPedidoFechado from "./RelatorioPedidoFechado";
import Header from "@/components/Header";
import ConfiguracaoModal from "@/components/ConfiguracaoModal";
import type { ReactNode } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabaseClient";
import { situacoesPedido, proximaSituacao, totalPedido, validarItensPedido, type PedidoItem, type SituacaoPedido } from "@/utils/pedidos";
import styles from "./pedidos.module.css";


type Pedido={revisao?:number;id:string;numero:number;cliente:string;obra:string;prazo:string|null;observacoes:string;itens:PedidoItem[];total:number;situacao:SituacaoPedido;versao:number;orcamento_id:string|null;origem_snapshot:Record<string,unknown>|null;criado_em:string};
type Orcamento={gc_alterado_em:string;id:string;numero_formatado:string;cliente_nome:string;obra_referencia:string;valor_total:number};
type Evento={id:number;evento:string;detalhe:string;criado_em:string};
const moeda=(n:number)=>Number(n).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
const linha=():PedidoItem=>({descricao:"",quantidade:1,preco:0,tipo:"material"});
const mensagemErro=(e:unknown)=>{const m=(e as {message?:string})?.message || "Não foi possível concluir a operação.";return /schema cache|does not exist|Could not find/i.test(m)?"Instale a atualização de Pedidos no Supabase para habilitar esta etapa.":m};
export default function PedidosPage(){
 const {user,empresaId,nomeEmpresa,signOut}=useAuth();
 const [acesso,setAcesso]=useState(false),[verificando,setVerificando]=useState(true),[erro,setErro]=useState("");
 const [pedidos,setPedidos]=useState<Pedido[]>([]),[busca,setBusca]=useState(""),[filtro,setFiltro]=useState(""),[pagina,setPagina]=useState(0),[ocupado,setOcupado]=useState(false),[carregando,setCarregando]=useState(false);
 const [buscaDigitada,setBuscaDigitada]=useState("");
 const [visualizacao,setVisualizacao]=useState<"tabela"|"quadro">("tabela");
 const [modal,setModal]=useState<"manual"|"converter"|"detalhe"|null>(null),[selecionado,setSelecionado]=useState<Pedido|null>(null),[eventos,setEventos]=useState<Evento[]>([]);
 const [cliente,setCliente]=useState(""),[obra,setObra]=useState(""),[prazo,setPrazo]=useState(""),[observacoes,setObservacoes]=useState(""),[itens,setItens]=useState<PedidoItem[]>([linha()]);

 const [orcamentos,setOrcamentos]=useState<Orcamento[]>([]),[buscaOrigem,setBuscaOrigem]=useState(""),[origem,setOrigem]=useState<Orcamento|null>(null),[aprovado,setAprovado]=useState(false);

 const [abaPedido,setAbaPedido]=useState<"pedido"|"financeiro"|"agenda"|"medidas">("pedido");

 const [destino,setDestino]=useState<SituacaoPedido|null>(null),[motivo,setMotivo]=useState(""),[erroModal,setErroModal]=useState("");

 const [itemEditando,setItemEditando]=useState<number|null>(null);
 const consultaAtual=useRef(0);

 useEffect(()=>{const timer=window.setTimeout(()=>{setPagina(0);setBusca(buscaDigitada)},350);return()=>window.clearTimeout(timer)},[buscaDigitada]);

 const resumo=useMemo(()=>({

  exibidos:pedidos.length,

  conferencia:pedidos.filter(p=>p.situacao==="conferencia").length,

  atrasados:pedidos.filter(p=>p.prazo && p.prazo < new Date().toISOString().slice(0,10) && !["entregue","cancelado"].includes(p.situacao)).length,

  valor:pedidos.reduce((s,p)=>s+Number(p.total||0),0)

 }),[pedidos]);

 const formatarData=(data:string|null)=>data?data.split("-").reverse().join("/"):"Não definido";

 const prazoAtrasado=(p:Pedido)=>Boolean(p.prazo && p.prazo < new Date().toISOString().slice(0,10) && !["entregue","cancelado"].includes(p.situacao));

 useEffect(()=>{if(!empresaId)return;let ativo=true;const token=new URLSearchParams(window.location.search).get("revisaoPedido");const r=token?lerRevisaoCalculo(token):null;if(r?.empresaId!==empresaId)return;void supabase.from("gc_pedidos").select("*").eq("empresa_id",empresaId).eq("id",r.pedidoId).maybeSingle().then(({data,error})=>{if(!ativo)return;if(error)setErro(mensagemErro(error));else if(data){setAbaPedido("medidas");setSelecionado(data);setEventos([]);setModal("detalhe")}});return()=>{ativo=false}},[empresaId]);

 const carregar=useCallback(async()=>{

  const consulta=++consultaAtual.current;

  if(!empresaId)return;setCarregando(true);

  try{const {data:permissoes,error:falha}=await supabase.rpc("gc_meus_modulos");if(consulta!==consultaAtual.current)return;if(falha)throw falha;

   if(permissoes?.gestao!==true){setAcesso(false);setPedidos([]);setModal(null);return}setAcesso(true);

   let query=supabase.from("gc_pedidos").select("*").eq("empresa_id",empresaId).order("criado_em",{ascending:false}).range(pagina*25,pagina*25+24);

   if(filtro)query=query.eq("situacao",filtro);if(busca.trim())query=query.ilike("cliente",`%${busca.trim()}%`);

   const {data,error}=await query;if(consulta!==consultaAtual.current)return;if(error)throw error;setPedidos(data||[]);setErro("");

  }catch(e){if(consulta!==consultaAtual.current)return;setErro(mensagemErro(e));setPedidos([]);setAcesso(false);setModal(null)}finally{if(consulta===consultaAtual.current){setVerificando(false);setCarregando(false)}}

 },[empresaId,pagina,filtro,busca]);

 useEffect(()=>{setPedidos([]);setAcesso(false);setModal(null);setVerificando(true);void carregar();return()=>{consultaAtual.current++}},[carregar]);

 useEffect(()=>{const focus=()=>void carregar();window.addEventListener("focus",focus);return()=>window.removeEventListener("focus",focus)},[carregar]);

 function abrirNovo(){setItemEditando(null);setSelecionado(null);setCliente("");setObra("");setPrazo("");setObservacoes("");setItens([]);setErroModal("");setModal("manual")}

 async function detalhe(p:Pedido){setAbaPedido("pedido");setSelecionado(p);setEventos([]);setErroModal("");setDestino(null);setMotivo("");setModal("detalhe");const {data,error}=await supabase.from("gc_pedido_eventos").select("*").eq("pedido_id",p.id).eq("empresa_id",empresaId!).order("criado_em",{ascending:false});if(error)setErroModal(mensagemErro(error));else setEventos(data||[])}

 function editar(){setItemEditando(null);if(!selecionado)return;setCliente(selecionado.cliente);setObra(selecionado.obra);setPrazo(selecionado.prazo||"");setObservacoes(selecionado.observacoes);setItens(selecionado.itens);setErroModal("");setModal("manual")}

 async function salvar(){setOcupado(true);setErroModal("");try{const args={p_cliente:cliente,p_obra:obra,p_prazo:prazo||null,p_observacoes:observacoes,p_itens:itens};const {error}=selecionado?await supabase.rpc("gc_editar_pedido",{...args,p_id:selecionado.id,p_versao:selecionado.versao}):await supabase.rpc("gc_criar_pedido",args);if(error)throw error;setModal(null);await carregar()}catch(e){setErroModal(mensagemErro(e))}finally{setOcupado(false)}}

 async function buscarOrcamentos(){setOcupado(true);setErroModal("");try{let query=supabase.from("orcamentos").select("id,numero_formatado,cliente_nome,obra_referencia,valor_total,gc_alterado_em").eq("empresa_id",empresaId!).is("gc_excluido_em",null).order("created_at",{ascending:false}).limit(50);if(buscaOrigem.trim())query=query.ilike("cliente_nome",`%${buscaOrigem.trim()}%`);const {data,error}=await query;if(error)throw error;setOrcamentos(data||[])}catch(e){setErroModal(mensagemErro(e))}finally{setOcupado(false)}}

 async function converter(){if(!origem||!aprovado)return;setOcupado(true);setErroModal("");try{const {error}=await supabase.rpc("gc_criar_pedido",{p_cliente:"",p_obra:"",p_prazo:prazo||null,p_observacoes:observacoes,p_itens:[],p_orcamento:String(origem.id),p_orcamento_alterado:origem.gc_alterado_em});if(error)throw error;setModal(null);await carregar()}catch(e){setErroModal(mensagemErro(e))}finally{setOcupado(false)}}

 async function alterarSituacao(){if(!selecionado||!destino)return;setOcupado(true);setErroModal("");try{const {error}=await supabase.rpc("gc_situacao_pedido",{p_id:selecionado.id,p_versao:selecionado.versao,p_situacao:destino,p_motivo:motivo});if(error)throw error;setModal(null);await carregar()}catch(e){setErroModal(mensagemErro(e))}finally{setOcupado(false)}}

 const bloqueado=Boolean(selecionado?.orcamento_id);

 return <div className={styles.page}><Header nomeEmpresa={nomeEmpresa||""} usuarioEmail={user?.email||""} handleSignOut={()=>void signOut()}/><main className={styles.main} hidden={modal!==null}>

 <div className={styles.heading}><div><p className={styles.eyebrow}>GESTÃO · PEDIDOS</p><h1>Gestão de Pedidos</h1><p>Do orçamento à entrega: acompanhe os pedidos em um só lugar.</p></div>{acesso&&<div className={styles.actions}><button onClick={()=>{setOrigem(null);setOrcamentos([]);setAprovado(false);setPrazo("");setObservacoes("");setErroModal("");setModal("converter")}}>Aprovar orçamento</button><button className={styles.primary} onClick={abrirNovo}>Novo pedido</button></div>}</div>

 {erro&&<p role="alert" className={styles.notice}>{erro}</p>}{verificando?<p>Verificando acesso…</p>:!acesso?<section className={styles.panel}><h2>Gestão não disponível</h2><p>O acesso depende da liberação do módulo para sua empresa e de uma conta ativa.</p><Link href="/modulos">Ver módulos da empresa</Link><button onClick={()=>void carregar()}>Verificar novamente</button></section>:<>

 <div className={styles.dashboardStats} aria-label="Resumo dos pedidos exibidos">

  <div className={styles.statCard}><span>Pedidos nesta página</span><strong>{resumo.exibidos}</strong><small>Resultados da página atual</small></div>

  <div className={styles.statCard}><span>Em conferência</span><strong>{resumo.conferencia}</strong><small>Nesta página</small></div>

  <div className={styles.statCard}><span>Prazos vencidos</span><strong>{resumo.atrasados}</strong><small>Pedidos exibidos, não concluídos</small></div>

  <div className={styles.statCard}><span>Valor dos pedidos</span><strong>{moeda(resumo.valor)}</strong><small>Soma dos pedidos exibidos</small></div>

 </div>

 <section className={styles.panel}>

  <div className={styles.listHeader}><div><h2>Pedidos cadastrados</h2><p>Consulte prazos, situações e detalhes dos pedidos.</p></div><div className={styles.viewSwitch} role="group" aria-label="Visualização"><button type="button" aria-pressed={visualizacao==="tabela"} className={visualizacao==="tabela"?styles.viewActive:""} onClick={()=>setVisualizacao("tabela")}>Tabela</button><button type="button" aria-pressed={visualizacao==="quadro"} className={visualizacao==="quadro"?styles.viewActive:""} onClick={()=>setVisualizacao("quadro")}>Quadro</button></div></div>

  <div className={styles.toolbar}><label>Buscar cliente<input value={buscaDigitada} onChange={e=>setBuscaDigitada(e.target.value)} placeholder="Digite o nome do cliente"/></label><label>Situação<select value={filtro} onChange={e=>{setFiltro(e.target.value);setPagina(0)}}><option value="">Todas</option>{Object.entries(situacoesPedido).map(([v,n])=><option key={v} value={v}>{n}</option>)}</select></label><button onClick={()=>void carregar()} disabled={carregando}>{carregando?"Atualizando…":"Atualizar"}</button></div>

  {visualizacao==="tabela"?<div className={styles.scroll}><table><thead><tr>{["Pedido","Cliente / obra","Prazo","Situação","Total",""].map((v,i)=><th key={i}>{v}</th>)}</tr></thead><tbody>{pedidos.map(p=><tr key={p.id}><td><strong>#{p.numero}</strong></td><td><strong>{p.cliente}</strong><small>{p.obra||"Sem obra informada"}</small></td><td><span className={prazoAtrasado(p)?styles.overdue:""}>{formatarData(p.prazo)}{prazoAtrasado(p)&&<small>Prazo vencido</small>}</span></td><td><span className={styles.badge}>{situacoesPedido[p.situacao]}</span></td><td>{moeda(p.total)}</td><td><button type="button" onClick={()=>void detalhe(p)}>Abrir pedido</button></td></tr>)}</tbody></table></div>:<div className={styles.orderGrid}>{pedidos.map(p=><article className={styles.orderCard} key={p.id}><div className={styles.orderCardTop}><strong>Pedido #{p.numero}</strong><span className={styles.badge}>{situacoesPedido[p.situacao]}</span></div><h3>{p.cliente}</h3><p>{p.obra||"Sem obra informada"}</p><div className={styles.orderCardMeta}><span>Prazo <strong className={prazoAtrasado(p)?styles.overdue:""}>{formatarData(p.prazo)}</strong></span><span>Total <strong>{moeda(p.total)}</strong></span></div><button type="button" onClick={()=>void detalhe(p)}>Abrir pedido</button></article>)}</div>}

  {!pedidos.length&&<p className={styles.empty}>{carregando?"Carregando…":"Nenhum pedido encontrado para os filtros selecionados."}</p>}

  <div className={styles.pagination}><button disabled={pagina===0||carregando} onClick={()=>setPagina(p=>p-1)}>Anterior</button><span>Página {pagina+1} · {pedidos.length} pedido(s) exibido(s)</span><button disabled={pedidos.length<25||carregando} onClick={()=>setPagina(p=>p+1)}>Próxima</button></div>

 </section></>}

 </main><EditorPedido aberto={modal!==null} ocupado={ocupado} fechar={()=>setModal(null)} titulo={modal==="manual"?(selecionado?`Editar pedido #${selecionado.numero}`:"Novo pedido"):modal==="converter"?"Aprovar orçamento e criar pedido":`Pedido #${selecionado?.numero||""}`}><div className={styles.form}>{erroModal&&<p role="alert" className={styles.notice}>{erroModal}</p>}

 {modal==="manual"&&<><p>{bloqueado?"Os dados e valores aprovados estão preservados. Você pode ajustar prazo e observações.":"Selecione o cliente e os materiais cadastrados para calcular o pedido. Use o ícone de editar para alterar e recalcular um item. Projetos completos continuam disponíveis em Aprovar orçamento."}</p>{empresaId && !bloqueado && <CatalogoPedido key={`${empresaId}-${itemEditando ?? "novo"}`} itemEdicao={itemEditando===null?undefined:itens[itemEditando]} cancelarEdicao={()=>setItemEditando(null)} empresaId={empresaId} cliente={cliente} setCliente={setCliente} obra={obra} setObra={setObra} adicionar={(novo) => {setItens(atuais => itemEditando!==null ? atuais.map((item,i)=>i===itemEditando?novo:item) : atuais.length === 1 && !atuais[0].descricao.trim() && atuais[0].preco === 0 ? [novo] : [...atuais, novo]);setItemEditando(null)}} disabled={ocupado||(itemEditando===null&&itens.length>=200)} />}{bloqueado&&<div className={styles.fields}><label>Cliente<input disabled={bloqueado||ocupado} maxLength={200} value={cliente} onChange={e=>setCliente(e.target.value)}/></label><label>Obra (opcional)<input disabled={bloqueado||ocupado} maxLength={200} value={obra} onChange={e=>setObra(e.target.value)}/></label></div>}<fieldset disabled={bloqueado||ocupado}>

 <legend>Itens do pedido</legend>

 <div className={styles.pedidoItensScroll}>

  <div className={styles.pedidoItensCabecalho} aria-hidden="true">

   <span>Quantidade</span><span>Descrição</span><span>Medida / Corte</span><span>Valor/m²</span><span>Valor unitário</span><span>Valor total</span><span>Ação</span>

  </div>

  {itens.map((item,i)=>{

   const atualizar=(dados:Partial<PedidoItem>)=>setItens(atuais=>atuais.map((atual,j)=>j===i?{...atual,...dados}:atual));

   const cadastrado=Boolean(item.catalogo);

   const perfil=item.catalogo?.tipo==="perfis";

   const corte=perfil ? item.catalogo?.memoria.match(/(?:\d+) cortes? de ([\d.,]+) mm/i)?.[1] : undefined;

   const temVidro=item.tipo==="vidro";

   return <div className={styles.pedidoItemLinha} key={i}>

    <div className={styles.pedidoCelula}>

     <input aria-label={`Quantidade do item ${i+1}`} type="number" min={cadastrado?1:0.001} step={cadastrado?1:0.001} readOnly={perfil} value={item.quantidade} onChange={e=>atualizar({quantidade:Number(e.target.value)})}/>

    </div>

    <div className={styles.pedidoCelula}>

     <input aria-label={`Descrição do item ${i+1}`} maxLength={500} readOnly={cadastrado} value={item.descricao} onChange={e=>atualizar({descricao:e.target.value})}/>



    </div>

    <div className={styles.pedidoCelula}>

     {temVidro?<>

      <div className={styles.pedidoMedidas}>

       <input aria-label={`Largura do vidro ${i+1} em mm`} type="number" min="1" placeholder="Larg." value={item.largura||""} readOnly={cadastrado} onChange={e=>atualizar({largura:Number(e.target.value)})}/>

       <span>×</span>

       <input aria-label={`Altura do vidro ${i+1} em mm`} type="number" min="1" placeholder="Alt." value={item.altura||""} readOnly={cadastrado} onChange={e=>atualizar({altura:Number(e.target.value)})}/>

      </div>

      {!cadastrado&&<input aria-label={`Especificação do vidro ${i+1}`} placeholder="Vidro, cor e espessura" maxLength={200} value={item.vidro||""} onChange={e=>atualizar({vidro:e.target.value})}/>}

     </>:perfil?<span className={styles.pedidoMedidaTexto}>{corte?`${corte} mm por corte`:"Barra inteira"}</span>:<span className={styles.pedidoSemMedida}>—</span>}

    </div>

    <div className={styles.pedidoValorTotal}>{temVidro && item.catalogo ? moeda(item.catalogo.precoM2 ?? item.catalogo.precoBase * (Math.max(item.largura||0,item.altura||0)>item.catalogo.regra.limite_mm ? 1+item.catalogo.regra.percentual/100 : 1)) : "—"}</div>
    <div className={styles.pedidoCelula}><input aria-label={`Valor unitário do item ${i+1}`} readOnly={cadastrado} type="number" min="0" step="0.01" value={item.preco} onChange={e=>atualizar({preco:Number(e.target.value)})}/></div>

    <div className={styles.pedidoValorTotal}>{moeda(item.quantidade*item.preco)}</div>

    <div className={styles.actions}><button type="button" title="Editar item" aria-label={`Editar item ${i+1}`} onClick={()=>{if(cadastrado){setItemEditando(i);window.scrollTo({top:0,behavior:"smooth"})}else{document.querySelector<HTMLInputElement>(`[aria-label="Descrição do item ${i+1}"]`)?.focus()}}}><Pencil size={16}/></button><button type="button" title="Excluir item" aria-label={`Remover item ${i+1}`} onClick={()=>{setItemEditando(null);setItens(atuais=>atuais.filter((_,j)=>j!==i))}}><Trash2 size={16}/></button></div>

   </div>;

  })}

 </div>

 <button type="button" disabled={itens.length>=200} onClick={()=>setItens(atuais=>[...atuais,linha()])}>+ Adicionar item manual</button>

</fieldset><p>Total: <strong>{moeda(totalPedido(itens))}</strong></p><label>Prazo<input type="date" value={prazo} onChange={e=>setPrazo(e.target.value)}/></label><label>Observações<textarea maxLength={3000} value={observacoes} onChange={e=>setObservacoes(e.target.value)}/></label><button className={styles.primary} disabled={ocupado||itemEditando!==null||!cliente.trim()||!validarItensPedido(itens)} onClick={()=>void salvar()}>{ocupado?"Salvando…":"Salvar pedido"}</button></>}

 {modal==="converter"&&<><p>Selecione um orçamento salvo. A confirmação registra sua aprovação, preserva os dados e valores e cria um pedido em conferência.</p><div className={styles.actions}><input placeholder="Buscar pelo cliente" value={buscaOrigem} onChange={e=>setBuscaOrigem(e.target.value)}/><button disabled={ocupado} onClick={()=>void buscarOrcamentos()}>Buscar orçamentos</button></div><p>Até 50 resultados recentes por busca.</p><div className={styles.origins}>{orcamentos.map(o=><button className={origem?.id===o.id?styles.selected:""} key={o.id} onClick={()=>{setOrigem(o);setAprovado(false)}}>{o.numero_formatado||"Sem número"} · {o.cliente_nome} · {moeda(o.valor_total)}<small>{o.obra_referencia}</small></button>)}</div>{origem&&<>{empresaId&&<PreviaOrcamento key={origem.id} id={origem.id} empresaId={empresaId}/>}<label>Prazo<input type="date" value={prazo} onChange={e=>setPrazo(e.target.value)}/></label><label>Observações<textarea maxLength={3000} value={observacoes} onChange={e=>setObservacoes(e.target.value)}/></label><label className={styles.check}><input type="checkbox" checked={aprovado} onChange={e=>setAprovado(e.target.checked)}/>Confirmo que o cliente aprovou este orçamento e seus valores.</label><button className={styles.primary} disabled={ocupado||!aprovado} onClick={()=>void converter()}>Confirmar aprovação e criar pedido</button></>}</>}

   {modal==="detalhe"&&selecionado&&<>

    <div className={styles.pedidoCabecalho}>

      <div><span className={styles.badge}>{situacoesPedido[selecionado.situacao]}</span><h2>{selecionado.cliente}</h2><p>{selecionado.obra||"Sem obra informada"}</p></div>

      <div className={styles.pedidoCabecalhoDireita}>

        <div className={styles.pedidoCabecalhoMeta}><small>Pedido #{selecionado.numero}</small><strong>{moeda(selecionado.total)}</strong></div>

        <details className={styles.pedidoMenuMais}>

          <summary>Ações do pedido</summary>

          <div className={styles.pedidoMenuConteudo}>

            {selecionado.situacao==="conferencia"&&<button type="button" onClick={e=>{e.currentTarget.closest("details")?.removeAttribute("open");editar()}}>Editar dados do pedido</button>}

            {proximaSituacao(selecionado.situacao)&&<button type="button" onClick={e=>{e.currentTarget.closest("details")?.removeAttribute("open");setDestino(proximaSituacao(selecionado.situacao));setMotivo("")}}>Avançar para {situacoesPedido[proximaSituacao(selecionado.situacao)!]}</button>}

            {selecionado.orcamento_id&&<Link href="/admin/relatorio.orcamento" className={styles.pedidoMenuLink}>Consultar orçamentos</Link>}

            {!['entregue','cancelado'].includes(selecionado.situacao)&&<><div className={styles.pedidoMenuSeparador}/><button type="button" className={styles.pedidoMenuPerigo} onClick={e=>{e.currentTarget.closest("details")?.removeAttribute("open");setDestino("cancelado");setMotivo("")}}>Cancelar pedido</button></>}

            {['entregue','cancelado'].includes(selecionado.situacao)&&!selecionado.orcamento_id&&<span className={styles.pedidoMenuVazio}>Nenhuma ação disponível</span>}

          </div>

        </details>

      </div>

    </div>

    {destino&&<div className={styles.notice}><p>Confirmar: {situacoesPedido[destino]}</p><label>Motivo<textarea value={motivo} maxLength={500} onChange={e=>setMotivo(e.target.value)}/></label><div className={styles.actions}><button type="button" disabled={ocupado||motivo.trim().length<3} onClick={()=>void alterarSituacao()}>Confirmar alteração</button><button type="button" disabled={ocupado} onClick={()=>{setDestino(null);setMotivo('')}}>Voltar</button></div></div>}

    <nav className={styles.pedidoAbas} aria-label="Seções do pedido">

      <button type="button" className={abaPedido==="pedido"?styles.pedidoAbaAtiva:""} aria-current={abaPedido==="pedido"?"page":undefined} onClick={()=>setAbaPedido("pedido")}>Pedido fechado</button>

      <button type="button" className={abaPedido==="financeiro"?styles.pedidoAbaAtiva:""} aria-current={abaPedido==="financeiro"?"page":undefined} onClick={()=>setAbaPedido("financeiro")}>Financeiro</button>

      <button type="button" className={abaPedido==="agenda"?styles.pedidoAbaAtiva:""} aria-current={abaPedido==="agenda"?"page":undefined} onClick={()=>setAbaPedido("agenda")}>Agenda e observações</button>

      <button type="button" className={abaPedido==="medidas"?styles.pedidoAbaAtiva:""} aria-current={abaPedido==="medidas"?"page":undefined} onClick={()=>setAbaPedido("medidas")}>Conferência de medidas</button>

    </nav>

    {abaPedido==="pedido"&&<div className={styles.pedidoConteudo}>

      <div className={styles.pedidoResumo}><div><small>Data do pedido</small><strong>{new Date(selecionado.criado_em).toLocaleDateString("pt-BR")}</strong></div><div><small>Prazo</small><strong>{selecionado.prazo?.split("-").reverse().join("/")||"Não definido"}</strong></div><div><small>Total fechado</small><strong>{moeda(selecionado.total)}</strong></div></div>

      {selecionado.orcamento_id && selecionado.origem_snapshot ? (

        <RelatorioPedidoFechado snapshot={selecionado.origem_snapshot} total={selecionado.total}/>

      ) : <>

        <h3>Itens do pedido</h3>

        {selecionado.itens.map((item,i)=><div className={styles.detailItem} key={i}><span>{item.descricao}{item.tipo==="vidro"&&<small>{item.largura} × {item.altura} mm · {item.vidro}</small>}<small>{item.quantidade} {item.unidade||"und"} × {moeda(item.preco)}</small>{item.catalogo&&<small>{item.catalogo.memoria}</small>}</span><span>{moeda(item.quantidade*item.preco)}</span></div>)}

        {selecionado.orcamento_id && <p className={styles.notice}>Os projetos originais não estão disponíveis neste registro. Confira os dados preservados antes de utilizá-lo na produção.</p>}

      </>}

    </div>}

    {abaPedido==="medidas"&&<div className={styles.pedidoConteudo}>

      <div className={styles.conferenciaCabecalho}><div><h3>Conferência de medidas</h3><p>Confira os projetos, ajuste as medidas permitidas e consulte as revisões técnicas do pedido.</p></div><span className={styles.badge}>Versão {selecionado.revisao||1}</span></div>

      {empresaId&&<EditarMedidasPedido pedido={selecionado} empresaId={empresaId} concluido={()=>{setModal(null);void carregar()}}/>}

      {empresaId&&<RevisaoPedido key={`revisao-${selecionado.id}`} pedido={selecionado} empresaId={empresaId} concluido={()=>{setModal(null);void carregar()}}/>}

    </div>}

    {abaPedido==="financeiro"&&<div className={styles.pedidoConteudo}>{empresaId&&<FinanceiroPedido resumo key={selecionado.id} pedido={selecionado} empresaId={empresaId}/>}</div>}

    {abaPedido==="agenda"&&<div className={styles.pedidoConteudo}>

      <h3>Agenda do pedido</h3>

      <div className={styles.pedidoResumo}><div><small>Pedido criado</small><strong>{new Date(selecionado.criado_em).toLocaleDateString("pt-BR")}</strong></div><div><small>Prazo previsto</small><strong>{selecionado.prazo?.split("-").reverse().join("/")||"Não definido"}</strong></div></div>

      <h3>Observações</h3><p className={styles.pedidoObservacoes}>{selecionado.observacoes?.trim()||"Nenhuma observação registrada."}</p>

      <h3>Histórico do pedido</h3>{eventos.length?eventos.map(e=><p className={styles.event} key={e.id}><small>{new Date(e.criado_em).toLocaleString("pt-BR")}</small>{e.detalhe}</p>):<p>Nenhum evento registrado.</p>}

      <p className={styles.pedidoNota}>Para alterar o prazo e as observações, utilize Editar dados do pedido enquanto o pedido estiver nessa situação. O cadastro de compromissos independentes ainda não está habilitado.</p>

    </div>}

  </>}</div></EditorPedido></div>

}



function EditorPedido({aberto,ocupado,fechar,titulo,children}:{aberto:boolean;ocupado:boolean;fechar:()=>void;titulo:string;children:ReactNode}) {

 const [confirmarSaida,setConfirmarSaida]=useState(false);

 useEffect(()=>{setConfirmarSaida(false)},[aberto,titulo]);

 useEffect(()=>{if(aberto)window.scrollTo({top:0,behavior:"instant"})},[aberto]);

 if(!aberto)return null;

 return <main className={styles.main}><div className={styles.heading}><div><p className={styles.eyebrow}>GESTÃO · PEDIDOS</p><h1>{titulo}</h1></div><button disabled={ocupado} onClick={()=>setConfirmarSaida(true)}>Voltar aos pedidos</button></div><section className={styles.editor}>{children}</section><ConfiguracaoModal compacto aberto={confirmarSaida} ocupado={ocupado} fechar={()=>setConfirmarSaida(false)} titulo="Voltar aos pedidos?"><div className={styles.exitConfirmation}><p>Você tem alterações não salvas.<br/>Deseja sair sem salvar?</p><div className={styles.exitActions}><button type="button" autoFocus disabled={ocupado} onClick={()=>setConfirmarSaida(false)}>Continuar editando</button><button type="button" disabled={ocupado} className={styles.exitDiscard} onClick={()=>{setConfirmarSaida(false);fechar()}}>Descartar e voltar</button></div></div></ConfiguracaoModal></main>;

}
