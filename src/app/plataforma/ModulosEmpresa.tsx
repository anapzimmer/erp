"use client";
import { useEffect, useState } from "react";
import ConfiguracaoModal from "@/components/ConfiguracaoModal";
import { consultarPlataforma } from "@/lib/plataforma";
export default function ModulosEmpresa({ empresa, fechar }: { empresa: { id: string; nome: string }; fechar: () => void }) {
 const [gestao,setGestao]=useState(false),[producao,setProducao]=useState(false),[motivo,setMotivo]=useState("");
 const [pronto,setPronto]=useState(false),[salvando,setSalvando]=useState(false),[mensagem,setMensagem]=useState("");
 const [historico,setHistorico]=useState<Array<{motivo:string;criado_em:string;novo:{gestao:boolean;producao:boolean}}>>([]);
 useEffect(()=>{let ativo=true;consultarPlataforma(`?modo=modulos&empresa=${encodeURIComponent(empresa.id)}`).then(d=>{if(!ativo)return;setGestao(d.gestao);setProducao(d.producao);setHistorico(d.historico);setPronto(true)}).catch(e=>{if(ativo)setMensagem(e.message)});return()=>{ativo=false}},[empresa.id]);
 async function salvar(){setSalvando(true);setMensagem("");try{await consultarPlataforma("",{acao:"modulos",empresa:empresa.id,gestao,producao,motivo});fechar()}catch(e){setMensagem(e instanceof Error?e.message:"Não foi possível salvar.")}finally{setSalvando(false)}}
 return <ConfiguracaoModal aberto fechar={fechar} ocupado={salvando} titulo={`Módulos · ${empresa.nome}`}>
 <p className="mb-4 text-sm text-text-secondary">Adicionais da empresa. Não alteram o plano de cálculos atual. As funcionalidades operacionais estão em implantação.</p>
 {mensagem&&<p role="alert">{mensagem}</p>}
 <fieldset disabled={!pronto||salvando} className="space-y-4">
 <label className="flex gap-3"><input type="checkbox" checked={gestao} onChange={e=>{setGestao(e.target.checked);if(!e.target.checked)setProducao(false)}}/>Gestão — pedidos e financeiro</label>
 <label className="flex gap-3"><input type="checkbox" checked={producao} onChange={e=>{setProducao(e.target.checked);if(e.target.checked)setGestao(true)}}/>Produção — estoque e planos de corte (exige Gestão)</label>
 <label className="block">Motivo da alteração<textarea className="mt-2 w-full rounded border p-2" maxLength={500} value={motivo} onChange={e=>setMotivo(e.target.value)} placeholder="Ex.: contratação do módulo Gestão"/></label>
 <button type="button" disabled={motivo.trim().length<3} onClick={()=>void salvar()} className="rounded border px-4 py-2 disabled:opacity-40">{salvando?"Salvando…":"Salvar liberações"}</button>
 </fieldset>
 <div className="mt-6 text-sm"><p>Últimas alterações</p>{historico.map((h,i)=><p className="mt-2 border-t pt-2" key={i}>{new Date(h.criado_em).toLocaleString("pt-BR")} · Gestão: {h.novo.gestao?"ativa":"inativa"} · Produção: {h.novo.producao?"ativa":"inativa"} · {h.motivo}</p>)}</div>
 </ConfiguracaoModal>
}
