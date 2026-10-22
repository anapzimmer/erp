import type { Metadata } from "next";
import { whatsappComercial } from "@/config/comercial";
import Link from "next/link";
import Image from "next/image";
import styles from "./glasscode.module.css";

export const metadata: Metadata = {
    title: { absolute: "Glass Code | Software para Vidraçaria, Cálculos e Orçamentos" },
    description: "Calcule vidros e espelhos, organize projetos e gere orçamentos em PDF. Conheça o Glass Code: software para vidraçarias com atendimento personalizado.",
    alternates: { canonical: "/" },
};

const contato = `https://wa.me/${whatsappComercial}?text=${encodeURIComponent("Olá! Quero conhecer o Glass Code e entender qual plano atende minha vidraçaria.")}`;

export default function GlassCodeSitePage() {
    return (
        <main className={styles.page}>
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
                        <Link href="/fundadores">Fundadores</Link>

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
                            Software para vidraçarias
                        </div>

                        <h1 className={styles.title}>
                            Do cálculo ao orçamento, <strong>feito para sua vidraçaria.</strong>
                        </h1>

                        <p className={styles.description}>
                            Calcule vidros e espelhos, organize projetos e apresente orçamentos profissionais.
                            Conte com atendimento personalizado e uma plataforma em evolução contínua, próxima da rotina do setor vidreiro.
                        </p>

                        <div className={styles.actions}>
                            <a href={contato} className={styles.primaryButton} target="_blank" rel="noopener noreferrer">
                                Conversar com a equipe
                            </a>

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
                                            Ilustração de projeto
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
            <section className={styles.valueSection} aria-labelledby="beneficios">
                <div className={styles.eyebrow}>UMA ROTINA MAIS ORGANIZADA</div>
                <h2 id="beneficios">Mais clareza para calcular, apresentar e acompanhar.</h2>
                <div className={styles.valueGrid}>
                    <article><h3>Cálculos de vidros e espelhos</h3><p>Trabalhe com medidas, materiais e acabamentos cadastrados para montar seus orçamentos.</p><Link href="/recursos">Conhecer os recursos →</Link></article>
                    <article><h3>Orçamentos com a sua marca</h3><p>Reúna os itens do projeto e gere documentos em PDF para apresentar uma proposta organizada ao cliente.</p><Link href="/como-funciona">Entender o fluxo →</Link></article>
                    <article><h3>Atendimento próximo</h3><p>Converse com a equipe sobre sua operação, tire dúvidas e compartilhe necessidades para a evolução do produto.</p><a href={contato} target="_blank" rel="noopener noreferrer">Falar com a equipe →</a></article>
                </div>
            </section>
            <section className={styles.valueSection} aria-labelledby="evolucao">
                <div className={styles.eyebrow}>DESENVOLVIDO COM QUEM USA</div>
                <h2 id="evolucao">Sua experiência ajuda a orientar os próximos passos.</h2>
                <p>O Glass Code está em desenvolvimento contínuo. Melhorias e novos recursos são avaliados a partir das necessidades do setor. Conheça as funcionalidades disponíveis hoje e escolha o plano que atende à sua empresa.</p>
                <div className={styles.actions}><Link className={styles.primaryButton} href="/planos">Comparar planos</Link><Link className={styles.secondaryButton} href="/fundadores">Conhecer os Parceiros Fundadores →</Link></div>
            </section>
            <section className={styles.valueSection} aria-labelledby="duvidas">
                <h2 id="duvidas">Dúvidas sobre o software para vidraçaria</h2>
                <details><summary>Para quem é o Glass Code?</summary><p>Para vidraçarias e empresas do setor vidreiro que precisam organizar cálculos, materiais, projetos e orçamentos. Consulte os recursos de cada plano antes de contratar.</p></details>
                <details><summary>Posso calcular vidros e espelhos e gerar PDF?</summary><p>O sistema oferece cálculos de vidros e espelhos e geração de orçamentos em PDF. A página de planos detalha os recursos incluídos em cada opção.</p></details>
                <details><summary>Como funciona o atendimento personalizado?</summary><p>Você pode falar com a equipe pelo WhatsApp para entender o sistema e esclarecer dúvidas sobre sua operação. Antes de contratar, confirme os canais, horários e o escopo de atendimento do plano. Desenvolvimento sob medida depende de avaliação.</p></details>
                <details><summary>Uma sugestão garante um novo recurso?</summary><p>Não. As sugestões ajudam a orientar a evolução, mas dependem de análise técnica e priorização. Recursos em preparação não devem ser considerados disponíveis na contratação.</p></details>
            </section>
            <footer className={styles.siteFooter}><span>Glass Code · Software para vidraçarias</span><Link href="/recursos">Recursos</Link><Link href="/planos">Planos</Link><Link href="/fundadores">Parceiros Fundadores</Link></footer>
        </main>
    );
}
