import Image from "next/image";
import Link from "next/link";
import { ArrowRight, LayoutDashboard } from "lucide-react";
import styles from "./not-found.module.css";

export default function NotFound() {
  return <main className={styles.page}>
    <Link href="/glasscode" className={styles.brand} aria-label="Glass Code — início"><Image src="/glasscode-icon.svg" alt="" width={24} height={36} /><span>Glass <span>Code</span></span></Link>
    <div className={styles.content}>
      <div className={styles.art} aria-hidden="true">
        <div className={styles.grid} /><div className={styles.halo} />
        <span className={styles.dimension}>UM NOVO CAMINHO PARA SUAS IDEIAS</span>
        <div className={styles.numbers}>
          <span className={styles.four}>4</span>
          <div className={styles.zero}><div className={styles.glass} /><Image className={styles.symbol} src="/glasscode-icon.svg" alt="" width={110} height={162} priority /><span className={styles.reflection} /></div>
          <span className={`${styles.four} ${styles.last}`}>4</span>
        </div>
        <span className={styles.line} /><span className={styles.cross}>+</span><span className={styles.caption}>ROTA NÃO ENCONTRADA / 404</span>
      </div>
      <div className={styles.message}>
        <p className={styles.eyebrow}>FORA DO PROJETO, POR UM INSTANTE.</p>
        <h1>Vamos encontrar<br />o caminho <em>certo?</em></h1>
        <p className={styles.description}>Esta página não existe ou mudou de endereço.<br />Seu próximo projeto está a poucos cliques daqui.</p>
        <nav className={styles.actions} aria-label="Voltar à navegação">
          <Link className={styles.primary} href="/dashboard"><LayoutDashboard size={17} />Ir para o Dashboard<ArrowRight size={17} /></Link>
          <Link className={styles.secondary} href="/glasscode">Página inicial <ArrowRight size={16} /></Link>
        </nav>
      </div>
    </div>
    <footer className={styles.footer}>GLASS CODE <span /> DA IDEIA À INSTALAÇÃO</footer>
  </main>;
}
