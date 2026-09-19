"use client";
import { useEffect, useRef, useState } from "react";
import { consultarPlataforma } from "@/lib/plataforma";
import { categorias, dataBrasil, mensagens, prazoRegularizacao, situacoes, type Situacao, type SituacaoDados } from "@/lib/situacaoConta";
import s from "./plataforma.module.css";
export type AlvoSituacao = { tipo: "empresa" | "usuario"; alvo: string; nome: string; atual: SituacaoDados };
export default function SituacaoContaModal({ alvo,onFechar,onSalvo }: { alvo: AlvoSituacao; onFechar:()=>void; onSalvo:()=>void }) {
  const [situacao,setSituacao]=useState<Situacao>(alvo.atual.situacao==='pagamento_pendente'?'regularizacao':alvo.atual.situacao||'ativa');
  const [categoria,setCategoria]=useState<keyof typeof categorias>(['pagamento_pendente','suspensa_inadimplencia'].includes(alvo.atual.situacao||'')?'inadimplencia':alvo.atual.categoria||'outro');
  const [nota,setNota]=useState('');
  const [mensagem,setMensagem]=useState(alvo.atual.mensagem_cliente||mensagens[alvo.atual.situacao||'ativa']);
  const [contato,setContato]=useState(alvo.atual.contato||'');
  const [prazo,setPrazo]=useState(alvo.atual.prazo||(alvo.atual.situacao==='pagamento_pendente'?prazoRegularizacao():''));
  const [erro,setErro]=useState('');const [salvando,setSalvando]=useState(false);const dialog=useRef<HTMLDialogElement>(null);const notaInput=useRef<HTMLTextAreaElement>(null);
  useEffect(()=>{dialog.current?.showModal();},[]);
  const bloqueia=['suspensa_inadimplencia','suspensa_outro','cancelada'].includes(situacao);
  function trocar(valor:Situacao){
    const nova=valor==='pagamento_pendente'?'regularizacao':valor;
    setSituacao(nova);setMensagem(mensagens[nova]);
    if(nova==='regularizacao')setPrazo(atual=>atual>=dataBrasil()?atual:prazoRegularizacao());
    if(['pagamento_pendente','suspensa_inadimplencia'].includes(valor))setCategoria('inadimplencia');
    else if(valor==='suspensa_outro'&&categoria==='inadimplencia')setCategoria('outro');
  }
  function trocarCategoria(valor:keyof typeof categorias){
    if(valor==='inadimplencia'&&situacao==='suspensa_outro')trocar('suspensa_inadimplencia');
    else if(valor!=='inadimplencia'&&situacao==='suspensa_inadimplencia')trocar('suspensa_outro');
    else if(valor!=='inadimplencia'&&situacao==='pagamento_pendente')trocar('regularizacao');
    else if(valor==='inadimplencia'&&situacao==='ativa')trocar('pagamento_pendente');
    else if(valor==='inadimplencia'&&situacao==='regularizacao')setPrazo(atual=>atual>=dataBrasil()?atual:prazoRegularizacao());
    setCategoria(valor);
  }
  async function salvar(e:React.FormEvent){
    e.preventDefault();if(salvando)return;
    if(nota.trim().length<3){setErro('Preencha a observação interna com pelo menos 3 caracteres para registrar o motivo no histórico.');notaInput.current?.focus();return;}
    if(situacao==='regularizacao'&&(!prazo||prazo<dataBrasil())){setErro('Informe um prazo de regularização a partir de hoje.');return;}
    if(situacao!=='ativa'&&!mensagem.trim()){setErro('Preencha a mensagem que será exibida ao cliente.');return;}
    setSalvando(true);setErro('');
    try{await consultarPlataforma('',{acao:'situacao',dados:{tipo:alvo.tipo,alvo:alvo.alvo,situacao,categoria,motivo:nota,mensagem,contato,prazo:situacao==='regularizacao'?prazo:null}});onSalvo();}
    catch(e){setErro(e instanceof Error?e.message:'Não foi possível salvar.');setSalvando(false);}
  }
  return <dialog ref={dialog} className={s.dialog} aria-labelledby="situacao-titulo" onCancel={e=>{if(salvando)e.preventDefault();else onFechar();}}><form noValidate onSubmit={salvar}>
    <h2 id="situacao-titulo">Gerenciar situação da conta</h2><p>{alvo.nome}</p>{alvo.atual.inicio_em&&<p>Situação atual desde {new Date(alvo.atual.inicio_em).toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo'})}.</p>}<p>{alvo.tipo==='empresa'?'A situação vale para todos os usuários desta empresa.':'Uma restrição da empresa continua valendo mesmo que este usuário seja liberado.'}</p>
    <fieldset disabled={salvando} className={s.fields}>
      <label>Situação<select autoFocus className={s.input} value={situacao} onChange={e=>trocar(e.target.value as Situacao)}>{Object.entries(situacoes).map(([v,n])=><option key={v} value={v}>{n}</option>)}</select></label>
      <label>Motivo padronizado<select className={s.input} value={categoria} onChange={e=>trocarCategoria(e.target.value as keyof typeof categorias)}>{Object.entries(categorias).map(([v,n])=><option key={v} value={v}>{n}</option>)}</select><small>O motivo pode ajustar a situação acima. Confira a situação e a prévia antes de confirmar.</small></label>
      {situacao==='regularizacao'&&<label>Prazo para regularização<input required type="date" min={dataBrasil()} className={s.input} value={prazo} onChange={e=>setPrazo(e.target.value)}/><small>Sugestão: 3 dias corridos, com acesso liberado. Você pode ajustar a data. O fim do prazo exige sua conferência; não haverá suspensão automática.</small></label>}
      <label>Observação interna (obrigatória) · somente você<textarea ref={notaInput} required aria-describedby="nota-interna-ajuda" minLength={3} maxLength={500} rows={2} className={s.input} value={nota} onChange={e=>setNota(e.target.value)} placeholder="Ex.: mensalidade de setembro pendente de pagamento"/><small id="nota-interna-ajuda">Escreva pelo menos 3 caracteres. O motivo padronizado não substitui esta observação, que fica somente no seu histórico.</small></label>
      {situacao!=='ativa'&&<><label>Mensagem exibida ao cliente<textarea required maxLength={1000} rows={4} className={s.input} value={mensagem} onChange={e=>setMensagem(e.target.value)}/></label><label>Canal de atendimento (opcional)<input maxLength={200} className={s.input} value={contato} onChange={e=>setContato(e.target.value)} placeholder="E-mail ou telefone de atendimento"/></label><div className={s.notice}><div><strong>Prévia para o cliente</strong>{mensagem}{prazo&&situacao==='regularizacao'&&<p>Prazo: {prazo.split('-').reverse().join('/')}</p>}{contato&&<p>Atendimento: {contato}</p>}</div></div></>}
    </fieldset>
    <p>{bloqueia?'Ao confirmar, o acesso será interrompido. Os dados serão preservados.':'Ao confirmar, esta restrição não impedirá o acesso. Outras restrições da empresa ou do usuário continuam valendo.'} A alteração começa agora e fica registrada no histórico.</p>
    {erro&&<p role="alert" className={s.error}>{erro}</p>}
    <div className={s.dialogActions}><button type="button" className={s.button} disabled={salvando} onClick={onFechar}>Voltar</button><button type="submit" className={`${s.button} ${s.primary}`} disabled={salvando}>{salvando?'Salvando…':'Confirmar situação'}</button></div>
  </form></dialog>;
}
