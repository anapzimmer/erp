"use client";

import { useState, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, LogOut, MessageCircle, RefreshCw, ShieldCheck } from "lucide-react";
import styles from "./TelaAcessoIndisponivel.module.css";

type Props = {
  titulo: string;
  texto: string;
  testeExpirado: boolean;
  erro: boolean;
  children?: ReactNode;
  verificar: () => void;
  sair: () => Promise<void>;
};

export default function TelaAcessoIndisponivel({ titulo, texto, testeExpirado, erro, children, verificar, sair }: Props) {
  const [saindo, setSaindo] = useState(false);
  const [falhaSaida, setFalhaSaida] = useState(false);
  const mensagem = testeExpirado
    ? "Olá! Meu teste do Glass Code terminou e quero continuar usando o sistema."
    : "Olá! Preciso de ajuda para regularizar o acesso da minha conta no Glass Code.";
  return <main className={styles.page}>
    <header className={styles.header}>
      <Link href="/glasscode" aria-label="Glass Code — página inicial" className={styles.brand}>
        <Image src="/glasscode-icon.svg" alt="" width={28} height={42} />
        <span>Glass <span className={styles.brandLight}>Code</span></span>
      </Link>
      <span className={styles.headerNote}><ShieldCheck size={15} /> Atendimento da conta</span>
    </header>

    <div className={styles.layout}>
      <section className={styles.scene} aria-hidden="true">
        <div className={styles.halo} />
        <div className={styles.orbit} /><div className={styles.orbitTwo} />
        <div className={styles.logo}>
          <Image src="/glasscode-icon.svg" alt="" width={184} height={270} priority />
        </div>
        <span className={`${styles.point} ${styles.pointOne}`} />
        <span className={`${styles.point} ${styles.pointTwo}`} />
        <span className={`${styles.point} ${styles.pointThree}`} />
        <div className={styles.sceneCaption}><span>DA IDEIA À INSTALAÇÃO</span><p>Seu próximo projeto<br />começa aqui.</p></div>
      </section>

      <section className={styles.content} aria-labelledby="acesso-titulo">
        <span className={styles.eyebrow}><span />{erro ? "Vamos reconectar" : testeExpirado ? "O próximo capítulo é seu" : "Vamos resolver juntos"}</span>
        <h1 id="acesso-titulo">{testeExpirado ? <>Boas ideias merecem <em>continuar.</em></> : erro ? <>Uma pausa na <em>conexão.</em></> : <>Uma pausa.<br />Novos projetos <em>pela frente.</em></>}</h1>
        <div className={styles.notice}>
          <h2>{titulo}</h2>
          <p>{texto}</p>
          {children}
        </div>
     
<div className={styles.actions}>
  {testeExpirado && !erro ? (
    <>
      <Link className={styles.primary} href="/contratar">
        Escolher meu plano
        <ArrowUpRight size={17} />
      </Link>

      <a
        className={styles.secondary}
        href={`https://wa.me/5546988271599?text=${encodeURIComponent(mensagem)}`}
        target="_blank"
        rel="noopener noreferrer"
      >
        <MessageCircle size={17} />
        Falar com o atendimento
      </a>
    </>
  ) : !erro ? (
    <a
      className={styles.primary}
      href={`https://wa.me/5546988271599?text=${encodeURIComponent(mensagem)}`}
      target="_blank"
      rel="noopener noreferrer"
    >
      <MessageCircle size={18} />
      Falar com o atendimento
      <ArrowUpRight size={17} />
    </a>
  ) : null}

  <button
    className={erro ? styles.primary : styles.secondary}
    onClick={verificar}
  >
    <RefreshCw size={15} />
    {erro ? "Tentar novamente" : "Verificar situação novamente"}
  </button>
</div>

        <p className={styles.hint}>{erro ? "Assim que a conexão for restabelecida, verificaremos seu acesso." : "Já conversou com a equipe? Verifique novamente após a confirmação da liberação."}</p>
        <button className={styles.exit} disabled={saindo} onClick={async () => {
          setSaindo(true); setFalhaSaida(false);
          try { await sair(); } catch { setFalhaSaida(true); } finally { setSaindo(false); }
        }}><LogOut size={14} />{saindo ? "Saindo…" : "Sair da conta"}</button>
        {falhaSaida && <p role="alert" className={styles.hint}>Não foi possível sair. Tente novamente.</p>}
      </section>
    </div>
    <footer className={styles.footer}><span>SOFTWARE PARA O SETOR DE VIDRO</span><span>Gestão · Projetos · Resultados</span></footer>
  </main>;
}
