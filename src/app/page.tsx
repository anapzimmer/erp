import Link from "next/link";
import Image from "next/image";
import styles from "./glasscode.module.css";

export default function GlassCodeSitePage() {
    return (
        <main className={styles.page}>
            <header className={styles.header}>
                <div className={styles.headerInner}>
                    <Link href="/glasscode" className={styles.brand}>
                        <Image src="/glasscode-icon.png" alt="" width={35} height={48} priority unoptimized style={{ objectFit: "contain", flexShrink: 0 }} />

                        <span className={styles.brandName}>
                            Glass Code
                        </span>
                    </Link>

                    <nav className={styles.nav}>
                        <a href="/">Produto</a>

                        <a href="/recursos">Recursos</a>
                        <Link href="/planos">Planos</Link>

                        <Link href="/login" className={styles.ctaSmall}>
                            Começar agora
                        </Link>
                    </nav>
                </div>
            </header>

            <section className={styles.hero}>
                <div className={styles.heroInner}>
                    <div className={styles.heroCopy}>
                        <svg className={styles.brandWatermark} viewBox="0 0 321 436" aria-hidden="true" focusable="false">
                            <path d="M12 126 229 3Q237-2 237 8V213Q237 222 228 228L12 353Q2 359 2 348V143Q2 132 12 126Z" className={styles.watermarkSilver} />
                            <path d="M94 207 308 83Q319 77 319 88V294Q319 305 309 311L95 433Q85 438 85 426V223Q85 213 94 207Z" className={styles.watermarkLime} />
                        </svg>
                        <div className={styles.eyebrow}>
                            Software para o setor de vidro
                        </div>

                        <h1 className={styles.title}>
                            Mais controle para um mercado que <strong>não para.</strong>
                        </h1>

                        <p className={styles.description}>
                            Projetos, cálculos, materiais e orçamentos conectados em uma
                            única plataforma desenvolvida para a rotina do setor vidreiro.
                        </p>

                        <div className={styles.actions}>
                            <Link href="/login" className={styles.primaryButton}>
                                Conhecer o Glass Code
                            </Link>

                            <a href="#produto" className={styles.secondaryButton}>
                                Ver como funciona <span>→</span>
                            </a>
                        </div>
                    </div>

                    <div className={styles.visual}>
                        <div className={styles.visualGlow} />

                        <div className={styles.softwareCard}>
                            <div className={styles.cardTop}>
                                <div className={styles.cardTopLeft}>
                                    <span className={styles.status} />
                                    Glass Code
                                </div>

                                <span className={styles.cardCode}>
                                    PROJETO / 001
                                </span>
                            </div>

                            <div className={styles.project}>
                                <div className={styles.projectHeader}>
                                    <div>
                                        <div className={styles.projectLabel}>
                                            Projeto selecionado
                                        </div>

                                        <div className={styles.projectTitle}>
                                            Porta de correr · 4 folhas
                                        </div>
                                    </div>

                                    <div className={styles.dimensions}>
                                        2400 × 2100 mm
                                    </div>
                                </div>

                                <div className={styles.drawing}>
                                    <div className={styles.windowDrawing}>
                                        {/* Folha fixa esquerda */}
                                        <span className={`${styles.pane} ${styles.fixedPane}`} />

                                        {/* Folha móvel esquerda */}
                                        <span className={`${styles.pane} ${styles.movingLeft}`}>
                                            <span className={styles.flatHandle} />

                                            <span className={styles.rollers}>
                                                <i />
                                                <i />
                                            </span>
                                        </span>

                                        {/* Folha móvel direita */}
                                        <span className={`${styles.pane} ${styles.movingRight}`}>
                                            <span className={styles.flatHandle} />

                                            <span className={styles.rollers}>
                                                <i />
                                                <i />
                                            </span>
                                        </span>

                                        {/* Folha fixa direita */}
                                        <span className={`${styles.pane} ${styles.fixedPane}`} />
                                    </div>
                                </div>

                                <div className={styles.results}>
                                    <div className={styles.result}>
                                        <span>Vidros</span>
                                        <strong>Calculado</strong>
                                    </div>

                                    <div className={styles.result}>
                                        <span>Perfis</span>
                                        <strong>Calculado</strong>
                                    </div>

                                    <div className={styles.result}>
                                        <span>Ferragens</span>
                                        <strong>Calculado</strong>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className={styles.heroFooter}>
                    <span>Gestão</span>
                    <span>Projetos</span>
                    <span>Processos</span>
                    <span>Resultados</span>
                </div>
            </section>
        </main>
    );
}
