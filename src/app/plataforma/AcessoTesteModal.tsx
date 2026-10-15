"use client";
import { useEffect, useRef, useState } from "react";
import { consultarPlataforma } from "@/lib/plataforma";
import styles from "./plataforma.module.css";

export type TesteUsuario = { dias: number; inicio_em: string; expira_em: string; pendente?: boolean };
export default function AcessoTesteModal({ usuario, onFechar, onSalvo }: {
  usuario: { id: string; email: string; teste?: TesteUsuario | null };
  onFechar: () => void; onSalvo: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const enviando = useRef(false);
  const [dias, setDias] = useState(usuario.teste?.dias || 5);
  const [senha, setSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [teste, setTeste] = useState(usuario.teste);
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState("");
  const [aviso, setAviso] = useState("");
  useEffect(() => { dialog.current?.showModal(); }, []);
  async function salvar(acao: "senha_usuario" | "teste_usuario") {
    if (enviando.current) return;
    setErro(""); setAviso("");
    if (acao === "senha_usuario" && senha !== confirmacao) { setErro("As senhas não conferem."); return; }
    enviando.current = true; setOcupado(true);
    try {
      const resultado = await consultarPlataforma("", { acao, alvo: usuario.id, email: usuario.email, ...(acao === "teste_usuario" ? { dias } : { senha }) });
      if (acao === "teste_usuario") {
        setTeste(resultado.teste);
        setAviso("Prazo atualizado. Ao terminar, o sistema bloqueará o acesso automaticamente.");
      } else {
        setSenha(""); setConfirmacao(""); setAviso("Senha alterada.");
      }
      onSalvo();
    } catch (e) { setErro(e instanceof Error ? e.message : "Não foi possível salvar."); }
    finally { enviando.current = false; setOcupado(false); }
  }
  return <dialog ref={dialog} className={styles.dialog} aria-labelledby="acesso-teste-titulo" onCancel={e => { if (ocupado) e.preventDefault(); else onFechar(); }}>
    <h2 id="acesso-teste-titulo">Senha e período de teste</h2><p>{usuario.email}</p>
    <form onSubmit={e => { e.preventDefault(); void salvar("teste_usuario"); }}>
      <fieldset disabled={ocupado} className={styles.fields}>
        <legend>Período de teste</legend>
        <p>{teste ? teste.pendente ? "Teste aguardando ativação." : `Acesso de teste até ${new Date(teste.expira_em).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })} (horário de Brasília).` : "Esta conta ainda não tem um prazo de teste."}</p>
        <label>Dias liberados a partir de agora<input className={styles.input} type="number" min={1} max={365} step={1} required value={dias} onChange={e => setDias(Number(e.target.value))} /></label>
        <p>Salvar inicia um novo prazo a partir de agora. Suspensões manuais do usuário ou da empresa continuam valendo.</p>
        <button className={styles.button} type="submit">Salvar prazo de teste</button>
      </fieldset>
    </form>
    <form onSubmit={e => { e.preventDefault(); void salvar("senha_usuario"); }}>
      <fieldset disabled={ocupado} className={styles.fields}>
        <legend>Alterar senha</legend>
        <label>Nova senha<input className={styles.input} type="password" autoComplete="new-password" required minLength={8} maxLength={128} value={senha} onChange={e => setSenha(e.target.value)} /></label>
        <label>Confirmar nova senha<input className={styles.input} type="password" autoComplete="new-password" required minLength={8} maxLength={128} value={confirmacao} onChange={e => setConfirmacao(e.target.value)} /></label>
        <button className={styles.button} type="submit">Alterar senha</button>
      </fieldset>
    </form>
    {erro && <p role="alert" className={styles.error}>{erro}</p>}
    {aviso && <p role="status">{aviso}</p>}
    <div className={styles.dialogActions}><button className={styles.button} disabled={ocupado} onClick={onFechar}>Fechar</button></div>
  </dialog>;
}
