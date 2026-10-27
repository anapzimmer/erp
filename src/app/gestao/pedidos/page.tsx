"use client";
import { useCallback, useEffect, useState, useRef } from "react";
import Link from "next/link";
import EditarMedidasPedido from "./EditarMedidasPedido";
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
function DetalhesOrigem({snapshot}:{snapshot:Record<string,unknown>}) {
 const dados=snapshot.itens;
 const objeto=dados && typeof dados==="object" && !Array.isArray(dados) ? dados as Record<string,unknown> : null;
 const lista=Array.isArray(dados)?dados:objeto?.documentoPdfCompleto || objeto?.projetosPdf || objeto?.itens || [];
 return <details open><summary>Projetos do orçamento aprovado</summary>{Array.isArray(lista)&&lista.length ? lista.map((item:Record<string,unknown>,i:number)=><div key={i} className={styles.detailItem}>{typeof item.desenhoUrl==="string" && /^(\/[^/]|https:\/\/|data:image\/(png|jpeg|webp);base64,)/.test(item.desenhoUrl) && <a href={item.desenhoUrl} target="_blank" rel="noopener noreferrer" aria-label="Ampliar desenho"><img className={styles.thumbnail} src={item.desenhoUrl} alt={String(item.projeto||"Desenho do projeto")} /></a>}<span>{String(item.projeto||item.descricao||item.nome||("Item "+(i+1)))}<small>{String(item.medidas||item.medidaReal||item.medida||"")}</small>{item.largura!=null&&item.altura!=null&&<small>{String(item.largura)} × {String(item.altura)} mm</small>}<small>{String(item.vidro||"")}</small></span><span>{item.valorTotal!=null||item.total!=null?moeda(Number(item.valorTotal??item.total)):""}</span></div>):<p>Os dados originais estão preservados. Consulte o orçamento de origem para o detalhamento deste formato.</p>}</details>
}
const linha=():PedidoItem=>({descricao:"",quantidade:1,preco:0});
const mensagemErro=(e:unknown)=>{const m=(e as {message?:string})?.message || "Não foi possível concluir a operação.";return /schema cache|does not exist|Could not find/i.test(m)?"Instale a atualização de Pedidos no Supabase para habilitar esta etapa.":m};
export default function PedidosPage(){
 const {user,empresaId,nomeEmpresa,signOut}=useAuth();
 const [acesso,setAcesso]=useState(false),[verificando,setVerificando]=useState(true),[erro,setErro]=useState("");
 const [pedidos,setPedidos]=useState<Pedido[]>([]),[busca,setBusca]=useState(""),[filtro,setFiltro]=useState(""),[pagina,setPagina]=useState(0),[ocupado,setOcupado]=useState(false),[carregando,setCarregando]=useState(false);
 const [modal,setModal]=useState<"manual"|"converter"|"detalhe"|null>(null),[selecionado,setSelecionado]=useState<Pedido|null>(null),[eventos,setEventos]=useState<Evento[]>([]);
 const [cliente,setCliente]=useState(""),[obra,setObra]=useState(""),[prazo,setPrazo]=useState(""),[observacoes,setObservacoes]=useState(""),[itens,setItens]=useState<PedidoItem[]>([linha()]);
 const [orcamentos,setOrcamentos]=useState<Orcamento[]>([]),[buscaOrigem,setBuscaOrigem]=useState(""),[origem,setOrigem]=useState<Orcamento|null>(null),[aprovado,setAprovado]=useState(false);
 const [abaPedido,setAbaPedido]=useState<"pedido"|"financeiro"|"agenda"|"medidas">("pedido");
 const [destino,setDestino]=useState<SituacaoPedido|null>(null),[motivo,setMotivo]=useState(""),[erroModal,setErroModal]=useState("");
 const consultaAtual=useRef(0);
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
 function abrirNovo(){setSelecionado(null);setCliente("");setObra("");setPrazo("");setObservacoes("");setItens([linha()]);setErroModal("");setModal("manual")}
 async function detalhe(p:Pedido){setAbaPedido("pedido");setSelecionado(p);setEventos([]);setErroModal("");setDestino(null);setMotivo("");setModal("detalhe");const {data,error}=await supabase.from("gc_pedido_eventos").select("*").eq("pedido_id",p.id).eq("empresa_id",empresaId!).order("criado_em",{ascending:false});if(error)setErroModal(mensagemErro(error));else setEventos(data||[])}
 function editar(){if(!selecionado)return;setCliente(selecionado.cliente);setObra(selecionado.obra);setPrazo(selecionado.prazo||"");setObservacoes(selecionado.observacoes);setItens(selecionado.itens);setErroModal("");setModal("manual")}
 async function salvar(){setOcupado(true);setErroModal("");try{const args={p_cliente:cliente,p_obra:obra,p_prazo:prazo||null,p_observacoes:observacoes,p_itens:itens};const {error}=selecionado?await supabase.rpc("gc_editar_pedido",{...args,p_id:selecionado.id,p_versao:selecionado.versao}):await supabase.rpc("gc_criar_pedido",args);if(error)throw error;setModal(null);await carregar()}catch(e){setErroModal(mensagemErro(e))}finally{setOcupado(false)}}
 async function buscarOrcamentos(){setOcupado(true);setErroModal("");try{let query=supabase.from("orcamentos").select("id,numero_formatado,cliente_nome,obra_referencia,valor_total,gc_alterado_em").eq("empresa_id",empresaId!).is("gc_excluido_em",null).order("created_at",{ascending:false}).limit(50);if(buscaOrigem.trim())query=query.ilike("cliente_nome",`%${buscaOrigem.trim()}%`);const {data,error}=await query;if(error)throw error;setOrcamentos(data||[])}catch(e){setErroModal(mensagemErro(e))}finally{setOcupado(false)}}
 async function converter(){if(!origem||!aprovado)return;setOcupado(true);setErroModal("");try{const {error}=await supabase.rpc("gc_criar_pedido",{p_cliente:"",p_obra:"",p_prazo:prazo||null,p_observacoes:observacoes,p_itens:[],p_orcamento:String(origem.id),p_orcamento_alterado:origem.gc_alterado_em});if(error)throw error;setModal(null);await carregar()}catch(e){setErroModal(mensagemErro(e))}finally{setOcupado(false)}}
 async function alterarSituacao(){if(!selecionado||!destino)return;setOcupado(true);setErroModal("");try{const {error}=await supabase.rpc("gc_situacao_pedido",{p_id:selecionado.id,p_versao:selecionado.versao,p_situacao:destino,p_motivo:motivo});if(error)throw error;setModal(null);await carregar()}catch(e){setErroModal(mensagemErro(e))}finally{setOcupado(false)}}
 const bloqueado=Boolean(selecionado?.orcamento_id);
 return <div className={styles.page}><Header nomeEmpresa={nomeEmpresa||""} usuarioEmail={user?.email||""} handleSignOut={()=>void signOut()}/><main className={styles.main} hidden={modal!==null}>
 <div className={styles.heading}><div><p className={styles.eyebrow}>GESTÃO · PEDIDOS</p><h1>Do orçamento à entrega</h1><p>Organize os pedidos, confira os valores e acompanhe cada etapa.</p></div>{acesso&&<div className={styles.actions}><button onClick={()=>{setOrigem(null);setOrcamentos([]);setAprovado(false);setPrazo("");setObservacoes("");setErroModal("");setModal("converter")}}>Aprovar orçamento</button><button className={styles.primary} onClick={abrirNovo}>Novo pedido</button></div>}</div>
 {erro&&<p role="alert" className={styles.notice}>{erro}</p>}{verificando?<p>Verificando acesso…</p>:!acesso?<section className={styles.panel}><h2>Gestão não disponível</h2><p>O acesso depende da liberação do módulo para sua empresa e de uma conta ativa.</p><Link href="/modulos">Ver módulos da empresa</Link><button onClick={()=>void carregar()}>Verificar novamente</button></section>:<>
 <p className={styles.notice}>Primeira etapa: pedidos e acompanhamento manual. Recebimentos disponíveis no menu Financeiro para usuários autorizados. Reserva de estoque e execução de cortes serão integradas depois.</p>
 <section className={styles.panel}><div className={styles.toolbar}><label>Buscar cliente<input value={busca} onChange={e=>{setBusca(e.target.value);setPagina(0)}} placeholder="Nome do cliente"/></label><label>Situação<select value={filtro} onChange={e=>{setFiltro(e.target.value);setPagina(0)}}><option value="">Todas</option>{Object.entries(situacoesPedido).map(([v,n])=><option key={v} value={v}>{n}</option>)}</select></label><button onClick={()=>void carregar()} disabled={carregando}>Atualizar</button></div>
 <div className={styles.scroll}><table><thead><tr>{["Pedido","Cliente / obra","Prazo","Situação","Total",""].map((v,i)=><th key={i}>{v}</th>)}</tr></thead><tbody>{pedidos.map(p=><tr key={p.id}><td>#{p.numero}</td><td>{p.cliente}<small>{p.obra||"Sem obra informada"}</small></td><td>{p.prazo?p.prazo.split("-").reverse().join("/"):"Não definido"}</td><td><span className={styles.badge}>{situacoesPedido[p.situacao]}</span></td><td>{moeda(p.total)}</td><td><button onClick={()=>void detalhe(p)}>Abrir</button></td></tr>)}</tbody></table></div>{!pedidos.length&&<p className={styles.empty}>{carregando?"Carregando…":"Nenhum pedido encontrado."}</p>}<div className={styles.pagination}><button disabled={pagina===0||carregando} onClick={()=>setPagina(p=>p-1)}>Anterior</button><span>Página {pagina+1}</span><button disabled={pedidos.length<25||carregando} onClick={()=>setPagina(p=>p+1)}>Próxima</button></div></section></>}
 </main><EditorPedido aberto={modal!==null} ocupado={ocupado} fechar={()=>setModal(null)} titulo={modal==="manual"?(selecionado?`Editar pedido #${selecionado.numero}`:"Novo pedido"):modal==="converter"?"Aprovar orçamento e criar pedido":`Pedido #${selecionado?.numero||""}`}><div className={styles.form}>{erroModal&&<p role="alert" className={styles.notice}>{erroModal}</p>}
 {modal==="manual"&&<><p>{bloqueado?"Os dados e valores aprovados estão preservados. Você pode ajustar prazo e observações.":"Informe os itens e os valores negociados. Para vidro avulso, informe medidas de corte e preço por peça. Para projetos calculados, use Aprovar orçamento para trazer os desenhos e materiais."}</p><div className={styles.fields}><label>Cliente<input disabled={bloqueado||ocupado} maxLength={200} value={cliente} onChange={e=>setCliente(e.target.value)}/></label><label>Obra (opcional)<input disabled={bloqueado||ocupado} maxLength={200} value={obra} onChange={e=>setObra(e.target.value)}/></label></div><fieldset disabled={bloqueado||ocupado}><legend>Itens do pedido</legend>{itens.map((item,i)=><div className={styles.item} key={i}><label>Tipo<select value={item.tipo||"material"} onChange={e=>setItens(itens.map((x,j)=>j===i?{...x,tipo:e.target.value as PedidoItem["tipo"]}:x))}><option value="material">Material</option><option value="vidro">Vidro avulso</option><option value="servico">Serviço</option></select></label><label>Descrição<input value={item.descricao} maxLength={500} onChange={e=>setItens(itens.map((x,j)=>j===i?{...x,descricao:e.target.value}:x))}/></label>{item.tipo==="vidro"&&<><label>Largura de corte (mm)<input type="number" min="1" value={item.largura||""} onChange={e=>setItens(itens.map((x,j)=>j===i?{...x,largura:Number(e.target.value)}:x))}/></label><label>Altura de corte (mm)<input type="number" min="1" value={item.altura||""} onChange={e=>setItens(itens.map((x,j)=>j===i?{...x,altura:Number(e.target.value)}:x))}/></label><label>Vidro · tipo, cor e espessura<input maxLength={200} placeholder="Ex.: Temperado Incolor 8 mm" value={item.vidro||""} onChange={e=>setItens(itens.map((x,j)=>j===i?{...x,vidro:e.target.value}:x))}/></label><svg viewBox="0 0 160 110" className={styles.thumbnail} aria-label="Peça retangular ilustrativa"><rect x="20" y="10" width="120" height="75" fill="white" stroke="currentColor"/><text x="80" y="103" textAnchor="middle" fontSize="10">{item.largura||0} × {item.altura||0} mm</text></svg></>}<label>Quantidade<input type="number" min="0.001" step="0.001" value={item.quantidade} onChange={e=>setItens(itens.map((x,j)=>j===i?{...x,quantidade:Number(e.target.value)}:x))}/></label><label>{item.tipo==="vidro"?"Valor por peça (R$)":"Valor unitário (R$)"}<input type="number" min="0" step="0.01" value={item.preco} onChange={e=>setItens(itens.map((x,j)=>j===i?{...x,preco:Number(e.target.value)}:x))}/></label><button aria-label={`Remover item ${i+1}`} onClick={()=>setItens(itens.filter((_,j)=>j!==i))}>Remover</button></div>)}<button disabled={itens.length>=200} onClick={()=>setItens([...itens,linha()])}>Adicionar item</button></fieldset><p>Total: <strong>{moeda(totalPedido(itens))}</strong></p><label>Prazo<input type="date" value={prazo} onChange={e=>setPrazo(e.target.value)}/></label><label>Observações<textarea maxLength={3000} value={observacoes} onChange={e=>setObservacoes(e.target.value)}/></label><button className={styles.primary} disabled={ocupado||!cliente.trim()||!validarItensPedido(itens)} onClick={()=>void salvar()}>{ocupado?"Salvando…":"Salvar pedido"}</button></>}
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
        {selecionado.itens.map((item,i)=><div className={styles.detailItem} key={i}><span>{item.descricao}{item.tipo==="vidro"&&<small>{item.largura} × {item.altura} mm · {item.vidro}</small>}<small>{item.quantidade} × {moeda(item.preco)}</small></span><span>{moeda(item.quantidade*item.preco)}</span></div>)}
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
