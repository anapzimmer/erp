"use client";

import Link from "next/link";
import Image from "next/image";
import { Check, ArrowUpRight } from "lucide-react";
import { usePathname } from "next/navigation";
import styles from "./planos.module.css";
import foundersStyles from "../fundadores/fundadores.module.css";
import { whatsappComercial, precosPlanosCentavos, recursosCompleto } from "@/config/comercial";
import { foundersComercial, moedaComercial } from "@/config/foundersComercial";


function contatoWhatsApp(plano?: { nome: string; valorCentavos: number }) {
  const mensagem = plano
    ? `Olá! Tenho interesse no plano ${plano.nome} do Glass Code (${moedaComercial(plano.valorCentavos)}/mês por empresa). Gostaria de saber como contratar.`
    : "Olá! Tenho interesse nos planos do Glass Code. Pode me ajudar a escolher o melhor plano para minha empresa?";
  return `https://wa.me/${whatsappComercial}?text=${encodeURIComponent(mensagem)}`;
}

const planos = [
  {
    numero: "01",
    nome: "Essencial",
    valorCentavos: precosPlanosCentavos.essencial,
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
    valorCentavos: precosPlanosCentavos.profissional,
    foco: "OPERAÇÃO COMPLETA",
    resumo: "Projetos + materiais",
    descricao:
      "Para vidraçarias que precisam calcular projetos, materiais e orçamentos no mesmo fluxo.",
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
    valorCentavos: precosPlanosCentavos.completo,
    destaque: true,
    foco: "PROJETOS AVANÇADOS",
    resumo: "Projetos especiais + operação completa",
    descricao:
      "A solução mais avançada do Glass Code: toda a operação e os recursos para projetos especiais.",
    itens: recursosCompleto,
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
        <div className={`${styles.headerInner} ${foundersStyles.headerInner}`}>
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

            <a
              href={contatoWhatsApp()}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.ctaSmall}
            >
              Falar pelo WhatsApp
            </a>
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
                SOLUÇÃO MAIS AVANÇADA
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
                <strong>{moedaComercial(plano.valorCentavos)}</strong>

                <div>
                  <small>por mês</small>
                  <small>por empresa</small>
                </div>
              </div>

              <span className={styles.planFocus}>
                {plano.resumo}
              </span>
            </div>

            <a
              href={contatoWhatsApp(plano)}
              target="_blank"
              rel="noopener noreferrer"
              className={
                plano.destaque
                  ? styles.primary
                  : styles.button
              }
            >
              <span>
                Tenho interesse no {plano.nome}
              </span>

              <ArrowUpRight size={16} />
            </a>

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
          PROGRAMA DE PARCEIROS FUNDADORES
      ===================================================== */}
      <section className={foundersStyles.banner} aria-labelledby="programa-fundadores">
        <div>
          <span className={foundersStyles.eyebrow}>PROGRAMA EXCLUSIVO · ATÉ {foundersComercial.limiteEmpresas} EMPRESAS</span>
          <h2 id="programa-fundadores">Parceiros Fundadores</h2>
          <p>Programa à parte dos planos: recursos equivalentes ao {foundersComercial.planoIncluido}, {foundersComercial.usuariosIncluidos} usuários e benefícios por contribuições reconhecidas.</p>
          <div className={foundersStyles.bannerPrice}>
            <strong>{moedaComercial(foundersComercial.precoPromocionalCentavos)}/mês</strong>
            <span>nas primeiras {foundersComercial.mensalidadesPagasPromocionais} mensalidades pagas · depois {moedaComercial(foundersComercial.precoRegularCentavos)}/mês, por empresa</span>
          </div>
          <p>Vagas sujeitas à confirmação de elegibilidade e disponibilidade.</p>
        </div>
        <Link href="/fundadores" className={foundersStyles.cta}>Conhecer o programa <ArrowUpRight size={18} aria-hidden="true" /></Link>
      </section>

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
            Escolha o plano e clique em “Tenho interesse”. O WhatsApp abrirá
            com uma mensagem pronta indicando o plano escolhido. Envie a
            mensagem para falar com a Glass Code sobre a contratação e a
            liberação da sua empresa.
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

        <a
          href={contatoWhatsApp()}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.finalCtaButton}
        >
          <span>Falar pelo WhatsApp</span>
          <ArrowUpRight size={17} />
        </a>
      </section>


      {/* =====================================================
          FOOTER
      ===================================================== */}
      <footer className={styles.footer}>
        <span>
          Glass Code · Software para o setor de vidro
        </span>

        <Link href="/">
          Voltar ao início
        </Link>
      </footer>

    </main>
  );
}
