import Link from "next/link";
import Image from "next/image";
import styles from "./glasscode.module.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Sistema para Vidraçaria: Orçamentos e Cálculos",
    description: "Sistema para pequenas vidraçarias: calcule vidros, espelhos e projetos, gere orçamentos em PDF e conte com atendimento personalizado. Conheça o Glass Code.",
    alternates: { canonical: "/" },
    openGraph: {
        type: "website",
        locale: "pt_BR",
        url: "https://www.glasscode.com.br/",
        siteName: "Glass Code",
        title: "Sistema para Vidraçaria: Orçamentos e Cálculos | Glass Code",
        description: "Cálculos, projetos e orçamentos em PDF para pequenas vidraçarias, com atendimento próximo para ajudar no dia a dia.",
    },
    robots: {
        index: true,
        follow: true,
        "max-image-preview": "none",
        googleBot: { index: true, follow: true, "max-image-preview": "none" },
    },
};

export default function GlassCodeSitePage() {
    return (
        <main className={styles.page}>
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
                "@context": "https://schema.org",
                "@graph": [
                    { "@type": "Organization", "@id": "https://www.glasscode.com.br/#organizacao", name: "Glass Code", url: "https://www.glasscode.com.br" },
                    { "@type": "WebSite", "@id": "https://www.glasscode.com.br/#site", name: "Glass Code", url: "https://www.glasscode.com.br", inLanguage: "pt-BR", publisher: { "@id": "https://www.glasscode.com.br/#organizacao" } }
                ]
            }).replace(/</g, "\\u003c") }} />

            <header className={styles.header}>
                <div className={styles.headerInner}>
                    <Link href="/" className={styles.brand}>
                        <Image src="/glasscode-icon.png" alt="" width={35} height={48} priority unoptimized style={{ objectFit: "contain", flexShrink: 0 }} />

                        <span className={styles.brandName}>
                            Glass Code
                        </span>
                    </Link>

                    <nav className={styles.nav}>
                        <Link href="/">Produto</Link>

                        <Link href="/recursos">Recursos</Link>
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
                            Feito para pequenas vidraçarias
                        </div>

                        <h1 className={styles.title}>
                            Sistema simples e rápido para sua <strong>vidraçaria.</strong>
                        </h1>

                        <p className={styles.description}>
                            Calcule vidros e espelhos, organize projetos e prepare orçamentos em PDF. O Glass Code ajuda pequenas vidraçarias a trabalhar com mais organização, com atendimento personalizado para as dúvidas do dia a dia.
                        </p>

                        <div className={styles.actions}>
                            <Link href="/recursos" className={styles.primaryButton}>
                                Conhecer os recursos
                            </Link>

                            <Link href="/como-funciona" className={styles.secondaryButton}>
                                Ver como funciona <span>→</span>
                            </Link>
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
                    <span>Cálculos de vidros e espelhos</span>
                    <span>Projetos</span>
                    <span>Orçamentos em PDF</span>
                    <span>Atendimento personalizado</span>
                </div>
            </section>
        </main>
    );
}
