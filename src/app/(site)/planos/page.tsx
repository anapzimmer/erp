"use client";

import Link from "next/link";
import Image from "next/image";
import { Check, ArrowUpRight } from "lucide-react";
import { usePathname } from "next/navigation";
import styles from "./planos.module.css";

const planos = [
  {
    numero: "01",
    nome: "Essencial",
    valor: 99,
    foco: "ORÇAMENTOS ESSENCIAIS",
    resumo: "Vidros e espelhos",
    descricao:
      "Para quem quer deixar planilhas para trás e começar a orçar com mais organização.",
    itens: [
      "Cadastro de clientes e obras",
      "Cálculo de vidros e espelhos",
      "Tabelas de vidros e acabamentos",
      "Orçamentos profissionais em PDF",
      "Logo e identidade da sua empresa",
      "Histórico de orçamentos",
    ],
  },
  {
    numero: "02",
    nome: "Profissional",
    valor: 179,
    foco: "OPERAÇÃO COMPLETA",
    resumo: "Projetos + materiais",
    descricao:
      "Para vidraçarias que precisam calcular projetos, materiais e orçamentos no mesmo fluxo.",
    destaque: true,
    itens: [
      "Tudo do plano Essencial",
      "Matriz de portas, janelas e boxes",
      "Cálculo de perfis, kits e ferragens",
      "Relação de materiais por projeto",
      "Central de impressão",
      "Detalhamento dos projetos",
      "Aproveitamento e perfis adicionais",
    ],
  },
  {
    numero: "03",
    nome: "Completo",
    valor: 249,
    foco: "PROJETOS AVANÇADOS",
    resumo: "Projetos especiais + operação completa",
    descricao:
      "Para empresas que trabalham com soluções especiais e precisam ampliar as possibilidades de projeto.",
    itens: [
      "Tudo do plano Profissional",
      "Sacada frontal",
      "Sacada na torre e com grapas",
      "Fechamento de sacada",
      "Pele de vidro",
      "Projetos com pinázio",
      "Cálculos fora do esquadro",
      "Documentos técnicos com desenhos",
    ],
  },
];

export default function PlanosPage() {
  const pathname = usePathname();

  return (
    <main className={styles.page}>

      {/* =====================================================
          HEADER
      ===================================================== */}
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
            <Link
              href="/"
              className={pathname === "/" ? styles.active : ""}
            >
              Produto
            </Link>


            <Link
              href="/como-funciona"
              className={pathname === "/como-funciona" ? styles.active : ""}
            >
              Como funciona
            </Link>

            <Link
              href="/recursos"
              className={pathname === "/recursos" ? styles.active : ""}
            >
              Recursos
            </Link>

            <Link
              href="/planos"
              className={pathname === "/planos" ? styles.active : ""}
            >
              Planos
            </Link>

            <Link
              href="/login"
              className={styles.ctaSmall}
            >
              Começar agora
            </Link>
          </nav>
        </div>
      </header>


      {/* =====================================================
          HERO
      ===================================================== */}
      <section className={styles.intro}>
        <span className={styles.eyebrow}>
          PLANOS GLASS CODE
        </span>

        <h1>
          Escolha o Glass Code
          <br />
          para o seu <em>momento.</em>
        </h1>

        <p>
          Comece pelo essencial ou leve toda a operação de projetos
          para dentro do Glass Code. Você escolhe a estrutura que
          acompanha a rotina da sua empresa.
        </p>
      </section>


      {/* =====================================================
          PLANOS
      ===================================================== */}
      <section
        className={styles.grid}
        aria-label="Planos Glass Code"
      >
        {planos.map((plano) => (
          <article
            key={plano.nome}
            className={`${styles.card} ${plano.destaque ? styles.featured : ""
              }`}
          >
            {plano.destaque && (
              <div className={styles.recommended}>
                MAIS ESCOLHIDO
              </div>
            )}

            <div className={styles.cardTop}>
              <span>{plano.foco}</span>

              <span className={styles.planNumber}>
                {plano.numero}
              </span>
            </div>

            <h2>{plano.nome}</h2>

            <p className={styles.description}>
              {plano.descricao}
            </p>

            <div className={styles.priceArea}>
              <div className={styles.price}>
                <span>R$</span>

                <strong>{plano.valor}</strong>

                <div>
                  <small>por mês</small>
                  <small>por empresa</small>
                </div>
              </div>

              <span className={styles.planFocus}>
                {plano.resumo}
              </span>
            </div>

            <Link
              href="/login"
              className={
                plano.destaque
                  ? styles.primary
                  : styles.button
              }
            >
              <span>
                Começar com {plano.nome}
              </span>

              <ArrowUpRight size={16} />
            </Link>

            <div className={styles.includesTitle}>
              O QUE ESTÁ INCLUÍDO
            </div>

            <ul>
              {plano.itens.map((item) => (
                <li key={item}>
                  <span className={styles.check}>
                    <Check
                      size={11}
                      strokeWidth={2}
                    />
                  </span>

                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </article>
        ))}
      </section>


      {/* =====================================================
          IDENTIDADE
      ===================================================== */}
      <section className={styles.included}>
        <div>
          <span className={styles.eyebrow}>
            SUA EMPRESA. SUA IDENTIDADE.
          </span>

          <h2>
            O Glass Code trabalha por trás.
            <br />
            A sua marca aparece na frente.
          </h2>
        </div>

        <p>
          Personalize seus documentos com a identidade da sua
          empresa e mantenha clientes, obras, projetos, materiais
          e orçamentos organizados em um único ambiente.
        </p>
      </section>


      {/* =====================================================
          FAQ
      ===================================================== */}
      <section className={styles.faq}>
        <span className={styles.eyebrow}>
          DÚVIDAS
        </span>

        <h2>Antes de começar.</h2>

        <details>
          <summary>
            Como funciona a contratação?
          </summary>

          <p>
            Escolha o plano que melhor representa a sua operação.
            A contratação e a liberação da empresa são realizadas
            pela Glass Code.
          </p>
        </details>

        <details>
          <summary>
            Posso usar a logo da minha empresa?
          </summary>

          <p>
            Sim. O Glass Code permite utilizar a identidade da sua
            empresa nos documentos e orçamentos gerados pelo sistema.
          </p>
        </details>

        <details>
          <summary>
            Posso mudar de plano depois?
          </summary>

          <p>
            Sim. Conforme sua operação crescer, o plano poderá ser
            ajustado para acompanhar os recursos necessários.
          </p>
        </details>

        <details>
          <summary>
            O valor é por usuário?
          </summary>

          <p>
            Os valores apresentados nesta página são mensais por
            empresa. As condições de usuários e acessos são definidas
            na contratação.
          </p>
        </details>
      </section>


      {/* =====================================================
          CTA FINAL
      ===================================================== */}
      <section className={styles.finalCta}>

        {/* símbolo Glass Code em marca d'água */}
        <div
          className={styles.ctaBrandMark}
          aria-hidden="true"
        >
          <span className={styles.ctaGlassBack} />
          <span className={styles.ctaGlassFront} />
        </div>

        <div className={styles.finalCtaContent}>
          <span className={styles.eyebrow}>
            GLASS CODE
          </span>

          <h2>
            Menos planilhas.
            <br />
            Mais controle.
          </h2>
        </div>

        <Link
          href="/login"
          className={styles.finalCtaButton}
        >
          <span>Começar agora</span>
          <ArrowUpRight size={17} />
        </Link>
      </section>


      {/* =====================================================
          FOOTER
      ===================================================== */}
      <footer className={styles.footer}>
        <span>
          Glass Code · Software para o setor de vidro
        </span>

        <Link href="/glasscode">
          Voltar ao início
        </Link>
      </footer>

    </main>
  );
}