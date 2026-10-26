"use client";
import styles from "./pedidos.module.css";

type Registro = Record<string, unknown>;
const obj = (v:unknown):Registro => v && typeof v === "object" && !Array.isArray(v) ? v as Registro : {};
const lista = (v:unknown):Registro[] => Array.isArray(v) ? v.filter(x=>x && typeof x === "object").map(obj) : [];
const txt = (v:unknown) => typeof v === "string" || typeof v === "number" ? String(v) : "";
const dinheiro = (v:unknown) => v != null && Number.isFinite(Number(v)) ? Number(v).toLocaleString("pt-BR",{style:"currency",currency:"BRL"}) : "—";
const medida = (v:unknown) => /^0\s*[x×]\s*0(?:\s*mm)?$/i.test(txt(v).trim()) ? "Não se aplica" : txt(v) || "—";
const desenhoValido = (v:unknown):v is string => typeof v === "string" && /^(\/[^/]|https:\/\/|data:image\/(png|jpeg|webp);base64,)/.test(v);

export default function RelatorioPedidoFechado({snapshot,total}:{snapshot:Registro|null;total:number}) {
 if (!snapshot) return <p className={styles.notice}>Este pedido não possui um orçamento de origem preservado.</p>;
 const raiz = obj(snapshot);
 const conteudo = obj(raiz.itens);
 const projetos = lista(conteudo.documentoPdfCompleto ?? conteudo.projetosPdf ?? conteudo.projetos ?? conteudo.itens ?? raiz.itens);
 const avulsos = lista(conteudo.materiaisAvulsos);
 return <section className={styles.report} aria-label="Projetos aprovados do pedido">
  <h3>Projetos do orçamento aprovado</h3>
  <p>Dados preservados na aprovação do pedido. O orçamento atual não é consultado para montar este relatório.</p>
  {projetos.map((p,i)=>{
   const itensVidro = lista(p.vidrosAvulsos);
   const materiais = lista(p.materiais);
   return <article className={styles.reportProject} key={i}>
    <div className={styles.reportProjectHeader}>
     {desenhoValido(p.desenhoUrl) && <a href={p.desenhoUrl} target="_blank" rel="noopener noreferrer"><img className={styles.thumbnail} src={p.desenhoUrl} alt={txt(p.projeto)||`Projeto ${i+1}`}/></a>}
     <div className={styles.reportProjectInfo}>
      <small>PROJETO {i+1}</small><h3>{txt(p.projeto||p.descricao||p.nome)||`Projeto ${i+1}`}</h3>
      <small>Medidas: {txt(p.medidas||p.medidaReal||p.medida)||(p.largura&&p.altura?`${txt(p.largura)} × ${txt(p.altura)} mm`:"Não informado")}</small>
      {p.quantidade!=null&&<small>Quantidade: {txt(p.quantidade)}</small>}
      {p.vidro!=null&&<small>Vidro: {txt(p.vidro)}</small>}
      {p.corKit!=null&&<small>Cor do kit: {txt(p.corKit)}</small>}
      {p.modeloKit!=null&&<small>Modelo do kit: {txt(p.modeloKit)}</small>}
      {p.trinco!=null&&<small>Trinco: {txt(p.trinco)}</small>}
     </div><div className={styles.reportProjectPrice}><small>Valor do projeto</small>{dinheiro(p.valorTotal??p.total)}</div>
    </div>
    {p.observacao!=null&&<p className={styles.reportNotes}>{txt(p.observacao)}</p>}
    {itensVidro.length>0&&<Tabela itens={itensVidro} titulo="Relação de vidros e materiais"/>}
    {materiais.length>0&&<details className={styles.reportComposition}><summary>Ver composição de materiais</summary><Tabela itens={materiais} titulo="Materiais"/></details>}
   </article>;
  })}
  {avulsos.length>0&&!projetos.some(p=>p.id==="materiais-avulsos")&&<article className={styles.reportProject}><h3>Materiais avulsos</h3><Tabela itens={avulsos} titulo="Materiais avulsos"/></article>}
  {!projetos.length&&!avulsos.length&&<p className={styles.notice}>O snapshot deste pedido não contém projetos em um formato reconhecido. Não vamos reconstruir os dados a partir do orçamento atual sem conferir a versão aprovada.</p>}
  <div className={styles.reportTotal}>Total contratado <strong>{dinheiro(total)}</strong></div>
 </section>;
}
function Tabela({itens,titulo}:{itens:Registro[];titulo:string}) {return <div className={`${styles.scroll} ${styles.reportTable}`} role="region" aria-label={titulo}><table><thead><tr><th>Qtd.</th><th>Descrição / vidro</th><th>Medidas</th><th>Preço / m² ou unitário</th><th>Total</th></tr></thead><tbody>{itens.map((m,i)=><tr key={i}><td>{txt(m.qtd??m.quantidade)||"—"}</td><td>{txt(m.vidro||m.descricao||m.nome)||"—"}{m.observacaoMedida!=null&&<small>{txt(m.observacaoMedida)}</small>}</td><td>{medida(m.medida??(m.largura!=null&&m.altura!=null?`${m.largura} × ${m.altura} mm`:null))}</td><td>{dinheiro(m.precoVidroM2??m.valorUnitario??m.preco)}</td><td>{dinheiro(m.valorTotal??m.total)}</td></tr>)}</tbody></table></div>}
