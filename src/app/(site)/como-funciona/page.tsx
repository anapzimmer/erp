"use client";

import Link from "next/link";
import Image from "next/image";
import styles from "./como-funciona.module.css";

const etapas = [
    {
        numero: "01",
        etiqueta: "ATENDIMENTO",
        titulo: "Receba a necessidade do seu cliente.",
        texto:
            "A partir das medidas e informações recebidas, sua equipe inicia o orçamento diretamente no Glass Code.",
        detalhes: [
            "Selecione o cliente",
            "Informe a obra ou referência",
            "Adicione quantos projetos forem necessários",
        ],
    },
    {
        numero: "02",
        etiqueta: "PROJETO",
        titulo: "Escolha o que será orçado.",
        texto:
            "Utilize a matriz de projetos para encontrar rapidamente a solução solicitada pelo cliente.",
        detalhes: [
            "Portas e janelas",
            "Boxes e espelhos",
            "Sacadas e fechamentos",
            "Pele de vidro e projetos especiais",
        ],
    },
    {
        numero: "03",
        etiqueta: "CÁLCULO",
        titulo: "Informe as medidas. O sistema faz o restante.",
        texto:
            "O Glass Code transforma as informações do projeto em dados organizados para composição do orçamento.",
        detalhes: [
            "Medidas dos vidros",
            "Metragem e quantidade",
            "Perfis e ferragens",
            "Kits e componentes",
        ],
    },
    {
        numero: "04",
        etiqueta: "PRECIFICAÇÃO",
        titulo: "Aplique os preços da sua indústria.",
        texto:
            "Vidros, materiais e condições comerciais entram na composição conforme os cadastros e tabelas da empresa.",
        detalhes: [
            "Preço do vidro",
            "Materiais e componentes",
            "Preços personalizados por cliente",
            "Valor final do projeto",
        ],
    },
    {
        numero: "05",
        etiqueta: "ORÇAMENTO",
        titulo: "Reúna tudo em uma única proposta.",
        texto:
            "Diferentes projetos podem fazer parte do mesmo orçamento, mantendo todas as informações do atendimento organizadas.",
        detalhes: [
            "Múltiplos projetos",
            "Resumo de valores",
            "Peso e metragem",
            "Dados do cliente",
        ],
    },
    {
        numero: "06",
        etiqueta: "ENVIO",
        titulo: "Gere o documento e envie ao cliente.",
        texto:
            "Finalize o atendimento com uma proposta organizada e mantenha o orçamento salvo para consultas futuras.",
        detalhes: [
            "Orçamento em PDF",
            "Apresentação profissional",
            "Histórico de orçamentos",
            "Consulta sempre que precisar",
        ],
    },
];

function FlowVisual() {
    return (
        <div className={styles.flowVisual}>
            <div className={styles.flowTop}>
                <span>ORÇAMENTO EM ANDAMENTO</span>
                <b>OR200901</b>
            </div>

            <div className={styles.flowCustomer}>
                <small>CLIENTE</small>
                <strong>Vidraçaria Exemplo</strong>
                <span>Obra · Residencial</span>
            </div>

            <div className={styles.flowProject}>
                <div className={styles.windowDrawing}>
                    <span />
                    <span />
                    <span />
                    <span />
                </div>

                <div className={styles.flowProjectInfo}>
                    <small>PROJETO 01</small>
                    <strong>Fixo 4 folhas</strong>
                    <span>2400 (L) × 2100 (H) mm</span>
                    <span>Perfis Branco</span>
                </div>

                <b className={styles.check}>✓</b>
            </div>

            <div className={styles.flowData}>
                <div>
                    <small>VIDRO</small>
                    <strong>Incolor 08 mm</strong>
                </div>

                <div>
                    <small>QUANTIDADE</small>
                    <strong>4 peças</strong>
                </div>

                <div>
                    <small>M²</small>
                    <strong>5,04 m²</strong>
                </div>
            </div>

            <div className={styles.flowTotal}>
                <span>
                    Cálculo concluído
                    <b>✓</b>
                </span>

                <div>
                    <small>VALOR DO PROJETO</small>
                    <strong>R$ 1.842,60</strong>
                </div>
            </div>
        </div>
    );
}

export default function ComoFuncionaPage() {
    return (
        <main className={styles.page}>
            <header className={styles.header}>
                <div className={styles.headerInner}>
                    <Link href="/" className={styles.brand}>
                        <Image
                            src="/glasscode-icon.png"
                            alt=""
                            width={35}
                            height={48}
                            priority
                            unoptimized
                            style={{
                                objectFit: "contain",
                                flexShrink: 0,
                            }}
                        />

                        <span className={styles.brandName}>
                            Glass Code
                        </span>
                    </Link>

                    <nav className={styles.nav}>
                        <Link href="/">Produto</Link>

                        <Link href="/como-funciona" className={styles.active}>
                            Como funciona
                        </Link>

                        <Link href="/recursos">Recursos</Link>
                        <Link href="/planos">Planos</Link>

                        <Link href="/planos" className={styles.ctaSmall}>
                            Começar agora
                        </Link>
                    </nav>
                </div>
            </header>

            <section className={styles.hero}>
                <div className={styles.heroInner}>
                    <div className={styles.heroText}>
                        <div className={styles.eyebrow}>
                            COMO FUNCIONA
                        </div>

                        <h1>
                            Do pedido do cliente
                            <br />
                            <strong>ao orçamento pronto.</strong>
                        </h1>

                        <p>
                            O Glass Code organiza as etapas do orçamento da sua
                            indústria de vidro temperado em um único fluxo:
                            cliente, projeto, cálculo, preço e proposta.
                        </p>

                        <Link href="#processo" className={styles.heroButton}>
                            Ver o processo
                            <span>↓</span>
                        </Link>
                    </div>

                    <div className={styles.heroVisual}>
                        <div className={styles.heroGlow} />
                        <FlowVisual />
                    </div>
                </div>

                <div className={styles.processBar}>
                    <span>CLIENTE</span>
                    <i />
                    <span>PROJETO</span>
                    <i />
                    <span>CÁLCULO</span>
                    <i />
                    <span>ORÇAMENTO</span>
                    <i />
                    <span>PROPOSTA</span>
                </div>
            </section>

            <section className={styles.intro} id="processo">
                <div className={styles.container}>
                    <span className={styles.sectionLabel}>
                        UM FLUXO MAIS SIMPLES
                    </span>

                    <div className={styles.introGrid}>
                        <h2>
                            Sua equipe informa.
                            <br />
                            <strong>O Glass Code organiza.</strong>
                        </h2>

                        <p>
                            Em vez de alternar entre planilhas, tabelas,
                            cálculos e documentos, as informações necessárias
                            para o orçamento permanecem conectadas durante
                            todo o atendimento.
                        </p>
                    </div>
                </div>
            </section>

            <section className={styles.steps}>
                <div className={styles.container}>
                    {etapas.map((etapa, index) => (
                        <article className={styles.step} key={etapa.numero}>
                            <div className={styles.stepNumber}>
                                {etapa.numero}
                            </div>

                            <div className={styles.stepContent}>
                                <span className={styles.stepLabel}>
                                    {etapa.etiqueta}
                                </span>

                                <h2>{etapa.titulo}</h2>

                                <p>{etapa.texto}</p>

                                <div className={styles.details}>
                                    {etapa.detalhes.map((detalhe) => (
                                        <span key={detalhe}>
                                            <b>+</b>
                                            {detalhe}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            <div className={styles.stepSide}>
                                <span>
                                    {index < etapas.length - 1
                                        ? "PRÓXIMA ETAPA"
                                        : "ORÇAMENTO CONCLUÍDO"}
                                </span>

                                <b>{index < etapas.length - 1 ? "↓" : "✓"}</b>
                            </div>
                        </article>
                    ))}
                </div>
            </section>

            <section className={styles.result}>
                <div className={styles.container}>
                    <div className={styles.resultBox}>
                        <div>
                            <span className={styles.sectionLabel}>
                                RESULTADO
                            </span>

                            <h2>
                                Mais agilidade para quem orça.
                                <br />
                                <strong>
                                    Mais qualidade para quem recebe.
                                </strong>
                            </h2>

                            <p>
                                Sua indústria ganha um processo comercial mais
                                organizado, enquanto o cliente recebe uma proposta
                                clara e profissional.
                            </p>
                        </div>

                        <div className={styles.resultStats}>
                            <div>
                                <strong>01</strong>
                                <span>Cliente</span>
                            </div>

                            <i>→</i>

                            <div>
                                <strong>+</strong>
                                <span>Projetos</span>
                            </div>

                            <i>→</i>

                            <div>
                                <strong>01</strong>
                                <span>Orçamento</span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <section className={styles.finalCta}>
                <div className={styles.finalGlow} />

                <div className={styles.finalContent}>
                    <span>GLASS CODE</span>

                    <h2>
                        Pronto para transformar
                        <br />
                        <strong>seu processo de orçamento?</strong>
                    </h2>

                    <p>
                        Conheça os planos e escolha a estrutura ideal
                        para sua indústria.
                    </p>

                    <div className={styles.finalActions}>
                        <Link href="/planos" className={styles.primaryButton}>
                            Conhecer os planos
                        </Link>

                        <Link href="/login" className={styles.secondaryButton}>
                            Já sou cliente →
                        </Link>
                    </div>
                </div>
            </section>
        </main>
    );
}