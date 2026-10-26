"use client";
import {useEffect,useState} from "react";
import ConfiguracaoModal from "@/components/ConfiguracaoModal";
import {consultarPlataforma} from "@/lib/plataforma";
export default function PermissaoFinanceiro({usuario,fechar}:{usuario:{id:string;email:string};fechar:()=>void}){
 const [liberado,setLiberado]=useState(false),[pronto,setPronto]=useState(false),[ocupado,setOcupado]=useState(false),[motivo,setMotivo]=useState(""),[erro,setErro]=useState("");
 useEffect(()=>{let ativo=true;consultarPlataforma(`?modo=permissao_financeiro&usuario=${usuario.id}`).then(d=>{if(ativo){setLiberado(d.liberado);setPronto(true)}}).catch(e=>{if(ativo)setErro(e.message)});return()=>{ativo=false}},[usuario.id]);
 async function salvar(){setOcupado(true);try{await consultarPlataforma("",{acao:"permissao_financeiro",usuario:usuario.id,liberado,motivo});fechar()}catch(e){setErro(e instanceof Error?e.message:"Falha ao salvar")}finally{setOcupado(false)}}
 return <ConfiguracaoModal aberto fechar={fechar} ocupado={ocupado} titulo="Acesso ao financeiro"><p className="mb-4">{usuario.email}</p><p className="mb-4 text-sm text-text-secondary">Permite consultar parcelas, registrar recebimentos e efetuar estornos. A empresa também precisa ter Gestão liberada.</p>{erro&&<p role="alert">{erro}</p>}<fieldset disabled={!pronto||ocupado} className="space-y-4"><label className="flex gap-3"><input type="checkbox" checked={liberado} onChange={e=>setLiberado(e.target.checked)}/>Autorizar financeiro da empresa</label><label className="block">Motivo<textarea className="mt-2 w-full rounded border p-2" maxLength={500} value={motivo} onChange={e=>setMotivo(e.target.value)}/></label><button disabled={motivo.trim().length<3} onClick={()=>void salvar()} className="rounded border px-4 py-2 disabled:opacity-40">Salvar permissão</button></fieldset></ConfiguracaoModal>
}
