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
    ? `Olá! Tenho interesse no plano ${plano.nome} do Glass Code (${moedaComercial(plano.valorCentavos)}/mês por empresa). Gostaria de conhecer os recursos, o atendimento incluído e as condições de contratação.`
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
      "Organize os cálculos e orçamentos do dia a dia, com apoio da equipe para utilizar o sistema.",
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
      "Conecte projetos, materiais e orçamentos, com orientação para aproveitar os recursos na rotina da vidraçaria.",
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
      "Trabalhe com todos os recursos dos planos e projetos especiais, com uma equipe próxima para esclarecer dúvidas de uso.",
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
          Soluções para sua vidraçaria.
          <br />
          Uma equipe <em>ao seu lado.</em>
        </h1>

        <p>
          O Glass Code reúne sistema, atendimento personalizado e evolução contínua para ajudar sua vidraçaria a calcular, organizar projetos e apresentar orçamentos. Escolha as soluções para sua rotina e conte com uma equipe para orientar o uso.
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
                Conversar sobre o {plano.nome}
              </span>

              <ArrowUpRight size={16} />
            </a>

            <div className={styles.supportNote}>
              <strong>Atendimento personalizado em todos os planos</strong>
              <span>Orientação de uso e espaço para compartilhar as necessidades da sua operação.</span>
            </div>

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
          <p>Os recursos do {foundersComercial.planoIncluido}, {foundersComercial.usuariosIncluidos} usuários e diálogo com a equipe para contribuir com experiências reais. Condições próprias e benefícios por contribuições reconhecidas, conforme as regras do programa.</p>
          <div className={foundersStyles.bannerPrice}>
            <strong>{moedaComercial(foundersComercial.precoPromocionalCentavos)}/mês</strong>
            <span>nas primeiras {foundersComercial.mensalidadesPagasPromocionais} mensalidades pagas · depois {moedaComercial(foundersComercial.precoRegularCentavos)}/mês, por empresa</span>
          </div>
          <p>Vagas sujeitas à confirmação de elegibilidade e disponibilidade.</p>
        </div>
        <Link href="/fundadores" className={foundersStyles.cta}>Conhecer o programa <ArrowUpRight size={18} aria-hidden="true" /></Link>
      </section>

      <section className={styles.supportSection} aria-labelledby="atendimento-planos">
        <span className={styles.eyebrow}>SISTEMA + ATENDIMENTO + EVOLUÇÃO</span>
        <h2 id="atendimento-planos">Mais que um sistema: soluções para o seu dia a dia.</h2>
        <div className={styles.supportGrid}>
          <article><h3>Do cálculo à proposta</h3><p>Calcule vidros e espelhos com os materiais e acabamentos cadastrados. Organize os itens e apresente orçamentos em PDF com a identidade da sua empresa, conforme os recursos do plano.</p></article>
          <article><h3>Atendimento que entende sua rotina</h3><p>Converse com a equipe sobre sua operação, esclareça dúvidas e receba orientação para aproveitar os recursos contratados. O atendimento personalizado faz parte da proposta em todos os planos.</p></article>
          <article><h3>Evolução com quem usa</h3><p>O Glass Code está em desenvolvimento contínuo. Compartilhe experiências e necessidades para ajudar a orientar melhorias. Sugestões passam por análise técnica e priorização, sem garantia de implementação ou prazo.</p></article>
        </div>
        <p className={styles.supportScope}>O atendimento personalizado está presente em todos os planos. Confirme com a equipe os canais, horários e o escopo antes de contratar. Treinamentos individuais, acompanhamento periódico e desenvolvimento sob medida dependem de avaliação e acordo específico.</p>
        <a href={contatoWhatsApp()} target="_blank" rel="noopener noreferrer" className={styles.button}>Falar sobre minha vidraçaria <ArrowUpRight size={16} /></a>
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
        <details><summary>Para quem são as soluções do Glass Code?</summary><p>Para vidraçarias e empresas do setor vidreiro que precisam organizar cálculos, materiais, projetos e orçamentos. A equipe ajuda a entender quais recursos atendem à sua rotina antes da contratação.</p></details>
        <details><summary>O que está por trás do valor do plano?</summary><p>Além dos recursos de cálculo e orçamento, a proposta do Glass Code inclui proximidade com a equipe e evolução contínua do produto. Confirme antes da contratação os canais, horários e o escopo de atendimento. Melhorias específicas e prazos de desenvolvimento dependem de avaliação.</p></details>
        <details><summary>Os recursos em desenvolvimento já estão incluídos?</summary><p>Considere na sua decisão os recursos disponíveis e descritos no plano. Novidades em preparação não têm entrega garantida; a equipe pode esclarecer o que já está disponível para sua operação.</p></details>

        <details>
          <summary>
            Como funciona a contratação?
          </summary>

          <p>
            Escolha o plano e clique em “Conversar sobre”. O WhatsApp abrirá
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
