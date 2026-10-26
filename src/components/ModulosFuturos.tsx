"use client";
import { useEffect, useRef } from "react";
import { whatsappComercial } from "@/config/comercial";
import { ArrowUpRight, ClipboardList, Layers3, Check } from "lucide-react";
import styles from "./ModulosFuturos.module.css";

const modulos = [
 { nome: "Gestão", subtitulo: "Do orçamento aprovado ao recebimento", Icon: ClipboardList,
 descricao: "O próximo passo do Glass Code: conectar os pedidos da empresa à rotina financeira.",
 itens: ["Converter orçamentos aprovados em pedidos ou cadastrar pedidos manualmente", "Acompanhar etapas, prazos e entregas", "Contas a receber e a pagar, entradas e parcelas", "Recebimentos parciais, inadimplência e fluxo de caixa", "Faturamento interno e relatórios financeiros"],
 condicao: "Inclusão prevista no Profissional e no Completo, após o lançamento." },
 { nome: "Produção", subtitulo: "Do pedido ao material pronto para entregar", Icon: Layers3,
 descricao: "Uma evolução para organizar materiais, reduzir desperdícios e acompanhar a produção por obra.",
 itens: ["Estoque de chapas, perfis, ferragens e acessórios", "Reservas por pedido, entradas, consumo e inventário", "Planos de corte de vidros e perfis por uma ou várias obras", "Identificação das peças e etiquetas por pedido e obra", "Retalhos, sobras aproveitáveis e necessidade de compra"],
 condicao: "Inclusão prevista no Completo, integrada ao módulo Gestão." },
];
export default function ModulosFuturos({ variante = "planos" }: { variante?: "planos" | "recursos" }){
 const ref = useRef<HTMLElement>(null);
 useEffect(()=>{
 if (!ref.current || !('IntersectionObserver' in window) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
 const observer = new IntersectionObserver(entries=>{for(const entry of entries) if(entry.isIntersecting){entry.target.setAttribute('data-visible','true');observer.unobserve(entry.target)}},{threshold:0.12});
 ref.current.querySelectorAll('article').forEach(el=>observer.observe(el));
 return ()=>observer.disconnect();
 },[]);
 return <section ref={ref} className={[styles.section, variante === "recursos" ? styles.recursos : ""].join(" ")} aria-labelledby="modulos-futuros">
 <div className={styles.heading}><div><span className={styles.eyebrow}>PRÓXIMOS MÓDULOS · EM DESENVOLVIMENTO</span><h2 id="modulos-futuros">Seu sistema acompanha<br/>o crescimento da sua empresa.</h2></div><p>Comece com os cálculos e projetos do seu plano. Gestão está prevista no Profissional e no Completo; Produção, no Completo. A liberação ocorrerá por empresa quando os módulos estiverem disponíveis.</p></div>
 <div className={styles.grid}>{modulos.map(({nome,subtitulo,Icon,descricao,itens,condicao})=><article className={styles.card} key={nome}>
 <div className={styles.top}><span className={styles.icon}><Icon size={23} strokeWidth={1.5}/></span><span className={styles.badge}>Em desenvolvimento</span></div>
 <h3>{nome}</h3><p className={styles.subtitle}>{subtitulo}</p><p className={styles.description}>{descricao}</p>
 <div className={styles.flow} aria-hidden="true">{(nome === "Gestão" ? ["Orçamento", "Pedido", "Recebimento"] : ["Reserva", "Corte", "Entrega"]).map((etapa,i)=><span key={etapa}><small>0{i+1}</small>{etapa}</span>)}</div><ul>{itens.map(item=><li key={item}><Check size={15} aria-hidden="true"/><span>{item}</span></li>)}</ul><p className={styles.condition}>{condicao}</p>
 </article>)}</div>
 <div className={styles.note}><p><strong>Planejados para as próximas etapas.</strong> Estes módulos ainda não estão disponíveis. A inclusão seguirá o plano apresentado nesta página após o lançamento, sem data anunciada. Até lá, a contratação dá acesso aos recursos já disponíveis. O aproveitamento de perfis já anunciado no Profissional permanece incluído.</p><p>Boletos, Pix com confirmação automática e emissão de notas fiscais serão integrações separadas, com condições e custos próprios. Faturamento interno não inclui emissão fiscal.</p><a href={`https://wa.me/${whatsappComercial}?text=${encodeURIComponent("Olá! Gostaria de conhecer os futuros módulos Gestão e Produção do Glass Code.")}`} target="_blank" rel="noopener noreferrer">Tirar dúvidas com a equipe <ArrowUpRight size={16}/></a></div>
 </section>}
