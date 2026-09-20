import Link from "next/link";
import styles from "./recursos.module.css";

const recursos = [
  {
    numero: "01",
    titulo: "Orçamentos e projetos",
    texto:
      "Monte orçamentos completos a partir dos projetos e centralize diferentes soluções em uma única proposta.",
    itens: [
      "Matriz de projetos",
      "Orçamentos com múltiplos itens",
      "Cliente e obra",
      "Peso, metragem e quantidade",
      "Histórico de orçamentos",
    ],
    tipo: "orcamento",
  },
  {
    numero: "02",
    titulo: "Cálculos para o setor vidreiro",
    texto:
      "Informe as medidas e deixe o Glass Code transformar o projeto em informações para orçamento e execução.",
    itens: [
      "Portas e janelas",
      "Boxes",
      "Vidros e espelhos",
      "Sacadas",
      "Pele de vidro",
      "Pinázios e projetos especiais",
    ],
    tipo: "calculo",
  },
  {
    numero: "03",
    titulo: "Materiais e precificação",
    texto:
      "Organize os componentes utilizados nos projetos e mantenha a formação dos seus orçamentos conectada aos seus cadastros.",
    itens: [
      "Vidros",
      "Ferragens",
      "Perfis",
      "Kits",
      "Acabamentos",
      "Serviços",
    ],
    tipo: "materiais",
  },
  {
    numero: "04",
    titulo: "Documentos e produção",
    texto:
      "Transforme o orçamento em documentos claros para apresentação, conferência e continuidade do processo.",
    itens: [
      "Orçamento em PDF",
      "Relatórios técnicos",
      "Central de impressão",
      "Detalhamento de projetos",
      "Informações para produção",
    ],
    tipo: "documentos",
  },
  {
    numero: "05",
    titulo: "Gestão em um só lugar",
    texto:
      "Mais organização para acompanhar clientes, projetos e informações importantes da operação.",
    itens: [
      "Cadastro de clientes",
      "Obras",
      "Histórico",
      "Configurações da empresa",
      "Identidade da empresa",
    ],
    tipo: "gestao",
  },
];

function BrandMark() {
  return (
    <span className={styles.brandIcon} aria-hidden="true">
      <span className={styles.glassOne} />
      <span className={styles.glassTwo} />
    </span>
  );
}

function FeatureVisual({ tipo }: { tipo: string }) {
if (tipo === "orcamento") {
  return (
    <div className={styles.pdfPreview}>
      {/* Cabeçalho do PDF */}
      <div className={styles.pdfHeader}>
        <div className={styles.pdfBrand}>
          <BrandMark />

          <div>
            <strong>Glass Code</strong>
            <small>ORÇAMENTOS & PROJETOS</small>
          </div>
        </div>

        <div className={styles.pdfHeaderInfo}>
          <span>2 projeto(s)</span>
          <span>20/09/2026</span>
        </div>
      </div>

      {/* Dados do orçamento */}
      <div className={styles.pdfCustomer}>
        <div>
          <small>Nº ORÇAMENTO</small>
          <strong>OR180906</strong>
        </div>

        <div>
          <small>CLIENTE</small>
          <strong>Cliente Exemplo</strong>
        </div>

        <div>
          <small>OBRA</small>
          <strong>Projetos</strong>
        </div>
      </div>

      {/* Projeto 1 */}
      <div className={styles.pdfProject}>
        <div className={styles.pdfDrawing}>
          <div className={styles.miniBox}>
            <span />
            <span />
          </div>
        </div>

        <div className={styles.pdfProjectContent}>
          <small className={styles.pdfProjectNumber}>
            PROJETO 1
          </small>

          <strong className={styles.pdfProjectTitle}>
            Box 2 folhas
          </strong>

          <div className={styles.pdfDataGrid}>
            <div>
              <small>MEDIDAS</small>
              <span>1780 × 1900 mm</span>
            </div>

            <div>
              <small>QUANTIDADE</small>
              <span>1</span>
            </div>

            <div>
              <small>VIDRO</small>
              <span>Incolor 08mm</span>
            </div>

            <div>
              <small>COR DO KIT</small>
              <span>Branco</span>
            </div>

            <div>
              <small>MODELO</small>
              <span>Tradicional</span>
            </div>

            <div>
              <small>VALOR TOTAL</small>
              <span>R$ 643,95</span>
            </div>
          </div>
        </div>
      </div>

      {/* Projeto 2 */}
      <div className={styles.pdfProject}>
        <div className={styles.pdfDrawing}>
          <div className={styles.miniMax}>
            <i />
            <span />
          </div>
        </div>

        <div className={styles.pdfProjectContent}>
          <small className={styles.pdfProjectNumber}>
            PROJETO 2
          </small>

          <strong className={styles.pdfProjectTitle}>
            MAX
          </strong>

          <div className={styles.pdfDataGrid}>
            <div>
              <small>MEDIDAS</small>
              <span>630 × 420 mm</span>
            </div>

            <div>
              <small>QUANTIDADE</small>
              <span>1</span>
            </div>

            <div>
              <small>VIDRO</small>
              <span>Fumê 08mm</span>
            </div>

            <div>
              <small>COR</small>
              <span>Branco</span>
            </div>

            <div>
              <small>TRINCO</small>
              <span>Max Único</span>
            </div>

            <div>
              <small>VALOR TOTAL</small>
              <span>R$ 178,41</span>
            </div>
          </div>
        </div>
      </div>

      {/* Rodapé resumo */}
      <div className={styles.pdfSummary}>
        <div>
          <small>VÃOS</small>
          <strong>2</strong>
        </div>

        <div>
          <small>PEÇAS</small>
          <strong>3</strong>
        </div>

        <div>
          <small>M² TOTAL</small>
          <strong>3,81 m²</strong>
        </div>

        <div className={styles.pdfTotal}>
          <small>VALOR DO ORÇAMENTO</small>
          <strong>R$ 822,36</strong>
        </div>
      </div>
    </div>
  );
}

if (tipo === "calculo") {
  return (
    <div className={styles.calculationVisual}>
      <div className={styles.visualLabel}>
        PROJETO EM CÁLCULO
      </div>

      <div className={styles.projectInfo}>
        <div>
          <small>PROJETO SELECIONADO</small>
          <strong>Porta de correr · 4 folhas</strong>
        </div>

        <span>2400 × 2100 mm</span>
      </div>

      <div className={styles.doorArea}>
        <div className={styles.doorFrame}>
          {/* Folha fixa esquerda */}
          <div
            className={`${styles.doorPane} ${styles.doorFixed}`}
          />

       {/* Folha móvel esquerda */}
<div
  className={`${styles.doorPane} ${styles.doorMovingLeft}`}
>
  <div className={styles.topRollers}>
    <i />
    <i />
  </div>

  <span
    className={`${styles.doorArrow} ${styles.arrowLeft}`}
  />

  <span
    className={`${styles.barHandle} ${styles.handleRight}`}
  />

  {/* metade esquerda da fechadura */}
  <span
    className={`${styles.lockHalf} ${styles.lockHalfLeft}`}
  >
    <i />
  </span>
</div>

      {/* Folha móvel direita */}
<div
  className={`${styles.doorPane} ${styles.doorMovingRight}`}
>
  <div className={styles.topRollers}>
    <i />
    <i />
  </div>

  <span
    className={`${styles.doorArrow} ${styles.arrowRight}`}
  />

  <span
    className={`${styles.barHandle} ${styles.handleLeft}`}
  />

  {/* metade direita da fechadura */}
  <span
    className={`${styles.lockHalf} ${styles.lockHalfRight}`}
  >
    <i />
  </span>
</div>

          {/* Folha fixa direita */}
          <div
            className={`${styles.doorPane} ${styles.doorFixed}`}
          />

      
        </div>
      </div>

      <div className={styles.calculationResults}>
        <span>
          VIDRO <b>✓</b>
        </span>

        <span>
          PERFIS <b>✓</b>
        </span>

        <span>
          FERRAGENS <b>✓</b>
        </span>
      </div>
    </div>
  );
}

if (tipo === "materiais") {
  return (
    <div className={styles.materialPdf}>
      {/* CABEÇALHO */}
      <div className={styles.materialPdfHeader}>
        <div className={styles.materialBrand}>
          <BrandMark />

          <div>
            <strong>Glass Code</strong>
            <small>RELAÇÃO DA OBRA</small>
          </div>
        </div>

        <div className={styles.materialPdfInfo}>
          <span>OR180906</span>
          <span>20/09/2026</span>
        </div>
      </div>

      {/* DADOS */}
      <div className={styles.materialOrder}>
        <div>
          <small>CLIENTE</small>
          <strong>Cliente Exemplo</strong>
        </div>

        <div>
          <small>OBRA</small>
          <strong>Projetos</strong>
        </div>

        <div>
          <small>M² TOTAL</small>
          <strong>3,81 m²</strong>
        </div>
      </div>

      {/* TÍTULO */}
      <div className={styles.materialTitle}>
        <div>
          <strong>Relação da obra</strong>
          <small>Materiais consolidados por projeto</small>
        </div>

        <span>2 projetos</span>
      </div>

      {/* VIDROS */}
      <div className={styles.materialGroup}>
        <div className={styles.materialGroupTitle}>
          <span className={styles.materialIcon}>V</span>

          <div>
            <small>VIDROS</small>
            <strong>3 peças</strong>
          </div>

          <b>R$ 510,97</b>
        </div>

        <div className={styles.materialRow}>
          <div>
            <small>MEDIDA</small>
            <span>890 × 1865</span>
          </div>

          <div className={styles.materialDescription}>
            <small>VIDRO</small>
            <span>Fixo incolor 08mm</span>
          </div>

          <div>
            <small>M²</small>
            <span>1,71</span>
          </div>

          <strong>R$ 222,30</strong>
        </div>

        <div className={styles.materialRow}>
          <div>
            <small>MEDIDA</small>
            <span>940 × 1900</span>
          </div>

          <div className={styles.materialDescription}>
            <small>VIDRO</small>
            <span>Móvel incolor 08mm</span>
          </div>

          <div>
            <small>M²</small>
            <span>1,81</span>
          </div>

          <strong>R$ 234,65</strong>
        </div>
      </div>

      {/* PERFIS */}
      <div className={styles.materialGroup}>
        <div className={styles.materialGroupTitle}>
          <span className={styles.materialIcon}>P</span>

          <div>
            <small>PERFIS</small>
            <strong>CT004 · Cantoneira 19×19</strong>
          </div>

          <b>R$ 50,88</b>
        </div>
      </div>

      {/* FERRAGENS */}
      <div className={styles.materialGroup}>
        <div className={styles.materialGroupTitle}>
          <span className={styles.materialIcon}>F</span>

          <div>
            <small>FERRAGENS</small>
            <strong>Kit F1 180 + Kit MAX</strong>
          </div>

          <b>R$ 260,51</b>
        </div>
      </div>

      {/* TOTAL */}
      <div className={styles.materialTotal}>
        <span>
          Materiais calculados
          <b>✓</b>
        </span>

        <div>
          <small>VALOR DO ORÇAMENTO</small>
          <strong>R$ 822,36</strong>
        </div>
      </div>
    </div>
  );
}

 if (tipo === "documentos") {
  return (
    <div className={styles.productionPreview}>
      {/* CABEÇALHO */}
      <div className={styles.productionHeader}>
        <div className={styles.productionBrand}>
          <BrandMark />

          <div>
            <strong>Glass Code</strong>
            <small>CENTRAL DE IMPRESSÃO</small>
          </div>
        </div>

        <div className={styles.productionStatus}>
          <i />
          <span>DOCUMENTOS PRONTOS</span>
        </div>
      </div>

      {/* CORPO */}
      <div className={styles.productionBody}>
        {/* FOLHA TÉCNICA */}
        <div className={styles.technicalSheet}>
          <div className={styles.sheetTop}>
            <div>
              <small>PROJETO 01</small>
              <strong>Porta de correr · 4 folhas</strong>
            </div>

            <span>2400 × 2100 mm</span>
          </div>

          <div className={styles.technicalDrawing}>
            <div className={styles.productionDoor}>
              {/* fixa */}
              <span className={styles.productionPane} />

              {/* móvel esquerda */}
              <span
                className={`${styles.productionPane} ${styles.productionMobile}`}
              >
                <i className={styles.productionRollerLeft} />
                <i className={styles.productionRollerRight} />

                <b className={styles.productionArrowLeft} />
                <em className={styles.productionHandleRight} />
              </span>

              {/* móvel direita */}
              <span
                className={`${styles.productionPane} ${styles.productionMobile}`}
              >
                <i className={styles.productionRollerLeft} />
                <i className={styles.productionRollerRight} />

                <b className={styles.productionArrowRight} />
                <em className={styles.productionHandleLeft} />
              </span>

              {/* fixa */}
              <span className={styles.productionPane} />
            </div>
          </div>

          <div className={styles.sheetData}>
            <div>
              <small>VIDRO</small>
              <strong>Incolor 08 mm</strong>
            </div>

            <div>
              <small>QUANTIDADE</small>
              <strong>4 peças</strong>
            </div>

            <div>
              <small>ACABAMENTO</small>
              <strong>Lapidado</strong>
            </div>
          </div>
        </div>

        {/* DOCUMENTOS */}
        <div className={styles.documentQueue}>
          <div className={styles.queueTitle}>
            <small>DOCUMENTOS</small>
            <strong>Saída do projeto</strong>
          </div>

          <div className={styles.queueItem}>
            <span className={styles.queueCheck}>✓</span>

            <div>
              <strong>Projeto técnico</strong>
              <small>Detalhamento</small>
            </div>

            <b>PDF</b>
          </div>

          <div className={styles.queueItem}>
            <span className={styles.queueCheck}>✓</span>

            <div>
              <strong>Relação da obra</strong>
              <small>Materiais</small>
            </div>

            <b>PDF</b>
          </div>

          <div className={styles.queueItem}>
            <span className={styles.queueCheck}>✓</span>

            <div>
              <strong>Orçamento</strong>
              <small>Apresentação</small>
            </div>

            <b>PDF</b>
          </div>

          <div className={styles.readyBox}>
            <small>STATUS</small>

            <strong>
              <i />
              Pronto para impressão
            </strong>
          </div>
        </div>
      </div>

      {/* RODAPÉ */}
      <div className={styles.productionFooter}>
        <div>
          <span>VIDRO</span>
          <b>✓</b>
        </div>

        <div>
          <span>PERFIS</span>
          <b>✓</b>
        </div>

        <div>
          <span>FERRAGENS</span>
          <b>✓</b>
        </div>

        <span className={styles.generatedPdf}>
          PDF GERADO
          <b>↗</b>
        </span>
      </div>
    </div>
  );
}

if (tipo === "gestao") {
  return (
    <div className={styles.dashboardPreview}>
      {/* TOPO */}
      <div className={styles.dashHero}>
        <div>
          <small>ESPAÇO DE TRABALHO</small>
          <strong>Boa tarde.</strong>
          <span>Seus clientes, orçamentos e projetos em um só lugar.</span>
        </div>

        <button type="button" tabIndex={-1}>
          <b>＋</b>
          Novo orçamento
          <span>↗</span>
        </button>

        <i className={styles.dashGlassOne} />
        <i className={styles.dashGlassTwo} />
      </div>

      {/* INDICADORES */}
      <div className={styles.dashStats}>
        <div className={`${styles.dashStat} ${styles.dashStatAccent}`}>
          <div className={styles.dashStatTop}>
            <span>Clientes</span>
            <b>♙</b>
          </div>

          <strong>79</strong>
          <small>Base cadastrada</small>
        </div>

        <div className={styles.dashStat}>
          <div className={styles.dashStatTop}>
            <span>Orçamentos</span>
            <b>▤</b>
          </div>

          <strong>532</strong>
          <small>Histórico da empresa</small>
        </div>

        <div className={`${styles.dashStat} ${styles.dashStatAccent}`}>
          <div className={styles.dashStatTop}>
            <span>Orçado neste mês</span>
            <b>◎</b>
          </div>

          <strong>R$ 82.470</strong>
          <small>Movimento mensal</small>
        </div>

        <div className={styles.dashStat}>
          <div className={styles.dashStatTop}>
            <span>Últimos 7 dias</span>
            <b>↗</b>
          </div>

          <strong>R$ 43.620</strong>
          <small>51 orçamento(s)</small>
        </div>
      </div>

      {/* ATALHOS DE PROJETO */}
      <div className={styles.dashProjects}>
        {/* JANELAS */}
        <div className={styles.dashProject}>
          <div className={styles.miniWindow}>
            <span />
            <span>
              <i />
            </span>
          </div>

          <div>
            <strong>Janelas</strong>
            <small>Escolha a tipologia</small>
          </div>

          <b>↗</b>
        </div>

        {/* BOX */}
        <div className={styles.dashProject}>
          <div className={styles.miniShower}>
            <span />
            <span />
          </div>

          <div>
            <strong>Box de banheiro</strong>
            <small>Calcule vidros e materiais</small>
          </div>

          <b>↗</b>
        </div>

        {/* SACADA */}
        <div className={styles.dashProject}>
          <div className={styles.miniBalcony}>
            <span />
            <span />
            <span />
            <span />
          </div>

          <div>
            <strong>Fechamento</strong>
            <small>Planeje seu projeto</small>
          </div>

          <b>↗</b>
        </div>
      </div>

      {/* PARTE INFERIOR */}
      <div className={styles.dashBottom}>
        <div className={styles.dashRecent}>
          <div>
            <small>ÚLTIMOS REGISTROS</small>
            <strong>Orçamentos recentes</strong>
          </div>

          <span>Ver todos ↗</span>
        </div>

        <div className={styles.dashToday}>
          <small>MOVIMENTO DO DIA</small>
          <strong>Resumo de hoje</strong>

          <div>
            <span>Orçamentos criados</span>
            <b>06</b>
          </div>
        </div>
      </div>
    </div>
  );
}
return null;
}

export default function RecursosPage() {
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Link href="/glasscode" className={styles.brand}>
            <BrandMark />
            <span className={styles.brandName}>Glass Code</span>
          </Link>

          <nav className={styles.nav}>
            <Link href="/">Produto</Link>

            <Link
              href="/recursos"
              className={styles.active}
            >
              Recursos
            </Link>

            <Link href="/planos">Planos</Link>

            <Link
              href="/glasscode#comecar"
              className={styles.ctaSmall}
            >
              Começar agora
            </Link>
          </nav>
        </div>
      </header>

      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <div className={styles.eyebrow}>
            Recursos Glass Code
          </div>

          <h1>
            Tecnologia que acompanha
            <br />
            <strong>todo o seu processo.</strong>
          </h1>

          <p>
            Do primeiro cálculo ao orçamento final, o Glass Code reúne
            ferramentas desenvolvidas para a rotina de quem trabalha
            com vidro.
          </p>
        </div>

        <div className={styles.heroDetail}>
          <span>PROJETAR</span>
          <i />
          <span>CALCULAR</span>
          <i />
          <span>ORÇAR</span>
          <i />
          <span>GERENCIAR</span>
        </div>
      </section>

      <section className={styles.intro}>
        <div className={styles.container}>
                 <div className={styles.introGrid}>
            <h2>
              Menos etapas soltas.
              <br />
              <span>Mais informação conectada.</span>
            </h2>

            <p>
              O Glass Code foi pensado para concentrar informações que
              normalmente ficam espalhadas entre planilhas, cálculos,
              anotações e documentos.
            </p>
          </div>
        </div>
      </section>

      <section className={styles.features}>
        <div className={styles.container}>
          {recursos.map((recurso, index) => (
            <article
              className={styles.feature}
              key={recurso.numero}
            >
              <div
                className={`${styles.featureContent} ${
                  index % 2 !== 0 ? styles.reverse : ""
                }`}
              >
                <div className={styles.featureText}>
                  <span className={styles.featureNumber}>
                    {recurso.numero}
                  </span>

                  <h2>{recurso.titulo}</h2>

                  <p>{recurso.texto}</p>

                  <div className={styles.featureList}>
                    {recurso.itens.map((item) => (
                      <div key={item}>
                        <span>+</span>
                        {item}
                      </div>
                    ))}
                  </div>
                </div>

                <div className={styles.visualArea}>
                  <div className={styles.visualGlow} />

                  <div className={styles.visualCard}>
                    <FeatureVisual tipo={recurso.tipo} />
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

  
      <section className={styles.finalCta} id="comecar">
        <div className={styles.finalGlow} />

        <div className={styles.finalContent}>
    

          <h2>
            Sua operação pode ser
            <br />
            <strong>mais simples.</strong>
          </h2>

          <p>
            Conheça uma plataforma criada para transformar vidro,
            projeto e informação em um processo mais organizado.
          </p>

          <div className={styles.finalActions}>
            <Link
              href="/glasscode#comecar"
              className={styles.primaryButton}
            >
              Começar agora
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