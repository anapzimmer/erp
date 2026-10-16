import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Check, Layers, MessageCircle, Sparkles, Users } from "lucide-react";
import { foundersComercial as oferta, moedaComercial, contatoFounders } from "@/config/foundersComercial";
import { precosPlanosCentavos } from "@/config/comercial";
import shell from "../planos/planos.module.css";
import styles from "./fundadores.module.css";

export const metadata: Metadata = {
  title: "Parceiros Fundadores",
  description: "Participe da evolução do Glass Code. Programa para até 30 empresas, com os recursos do plano Completo, três usuários e benefícios por participação.",
  alternates: { canonical: "https://www.glasscode.com.br/fundadores" },
  openGraph: {
    title: "Parceiros Fundadores | Glass Code",
    description: "O futuro do Glass Code também pode ter a sua assinatura. Primeira turma de até 30 empresas.",
    url: "https://www.glasscode.com.br/fundadores",
    type: "website",
  },
};

const beneficios = [
  { titulo: "Sistema completo", texto: `Todos os recursos previstos no plano ${oferta.planoIncluido}, para ${oferta.usuariosIncluidos} usuários da sua empresa.` },
  { titulo: "Voz na evolução", texto: "Envie sugestões e participe de votações consultivas. Elas orientam prioridades, sem garantia de implementação." },
  { titulo: "Pontos e benefícios", texto: "Contribuições reconhecidas geram pontos para resgates sujeitos a regras e aprovação, além da identificação de parceiro fundador e acesso antecipado a recursos selecionados, quando disponíveis." },
];

const etapas = [
  ["Demonstre interesse", "Fale com a equipe pelo WhatsApp."],
  ["Confirme a disponibilidade", "Verificamos elegibilidade e vaga."],
  ["Aceite as condições", "Conheça os termos e a contratação paga."],
  ["Comece a utilizar", "Após a habilitação, use na sua operação."],
  ["Participe e acumule pontos", "Contribuições reconhecidas podem gerar pontos."],
  ["Resgate benefícios", "Solicite recompensas, sujeitas a aprovação."],
];

const regras = [
  `Descontos de mensalidade somente após as ${oferta.mensalidadesPagasPromocionais} primeiras mensalidades pagas.`,
  "Resgates dependem de solicitação, saldo e aprovação. Um desconto por ciclo.",
  "Pontos não são dinheiro nem transferíveis entre empresas, e não geram saldo negativo.",
  "Votar não gera pontos automaticamente. Não há redução automática de cobrança.",
];

const perguntas = [
  ["Qual é o preço depois da promoção?", `São ${moedaComercial(oferta.precoPromocionalCentavos)} por mês nas primeiras ${oferta.mensalidadesPagasPromocionais} mensalidades pagas e ${moedaComercial(oferta.precoRegularCentavos)} por mês a partir da quarta, por empresa. O período promocional é pago, não é teste gratuito. Para referência, o preço de tabela do plano Completo hoje é ${moedaComercial(precosPlanosCentavos.completo)}/mês; isso é uma comparação de tabela, sem garantia de economia permanente ou de manutenção vitalícia do valor.`],
  ["Quantas empresas e usuários?", `A primeira turma comporta até ${oferta.limiteEmpresas} empresas, com ${oferta.usuariosIncluidos} usuários por empresa. A equipe confirma elegibilidade e vaga; manifestar interesse não reserva vaga.`],
  ["Preciso contratar para participar?", "Sim. Após a confirmação, a equipe apresenta as condições para aceite e contratação paga. O botão de interesse abre uma conversa no WhatsApp; ele não contrata nem gera cobrança automática."],
  ["Qual é a diferença para o plano Completo?", "Os recursos do sistema são os mesmos previstos no Completo. O programa acrescenta condições comerciais próprias, participação consultiva, identificação de fundador e benefícios por contribuições reconhecidas, com limite de empresas."],
  ["Como funcionam as votações?", "São consultivas: ajudam a equipe a entender prioridades, mas não garantem que uma sugestão será implementada. A participação não representa participação societária nem propriedade sobre o software."],
];

function Contato({ children }: { children: React.ReactNode }) {
  return (
    <a className={styles.cta} href={contatoFounders} target="_blank" rel="noopener noreferrer">
      <MessageCircle size={17} aria-hidden="true" />
      <span>{children}</span>
      <ArrowUpRight size={17} aria-hidden="true" />
    </a>
  );
}

export default function FundadoresPage() {
  return (
    <main className={`${shell.page} ${styles.page}`}>
      <header className={shell.header}>
        <div className={shell.headerInner}>
          <Link href="/" className={shell.brand}>
            <Image src="/glasscode-icon.png" alt="" width={35} height={48} priority unoptimized />
            <span className={shell.brandName}>Glass Code</span>
          </Link>
          <nav className={shell.nav} aria-label="Navegação principal">
            <Link href="/">Produto</Link>
            <Link href="/como-funciona">Como funciona</Link>
            <Link href="/recursos">Recursos</Link>
            <Link href="/planos">Planos</Link>
            <Link href="/fundadores" className={shell.active} aria-current="page">Fundadores</Link>
          </nav>
        </div>
      </header>

      <section className={styles.hero}>
        <div className={styles.heroText}>
          <span className={styles.eyebrow}>PROGRAMA PARCEIROS FUNDADORES</span>
          <h1>O futuro do Glass Code também pode ter <em>a sua assinatura.</em></h1>
          <p className={styles.lead}>Faça parte das primeiras {oferta.limiteEmpresas} empresas que vão contribuir para a evolução de uma nova geração de software para o setor vidreiro.</p>
          <Contato>Quero ser Parceiro Fundador</Contato>
          <p className={styles.fine}>Manifestar interesse não reserva vaga. A equipe confirma elegibilidade e disponibilidade.</p>
        </div>

        <aside className={styles.offer} aria-label="Condições comerciais">
          <span className={styles.offerLabel}>Primeira turma · por empresa</span>
          <div className={styles.price}>{moedaComercial(oferta.precoPromocionalCentavos)}<small>/mês</small></div>
          <p className={styles.offerNote}>nas {oferta.mensalidadesPagasPromocionais} primeiras mensalidades pagas</p>
          <div className={styles.then}>
            <span>A partir da quarta mensalidade</span>
            <strong>{moedaComercial(oferta.precoRegularCentavos)}/mês</strong>
          </div>
          <ul>
            <li><Check size={15} aria-hidden="true" />Recursos equivalentes ao plano {oferta.planoIncluido}</li>
            <li><Check size={15} aria-hidden="true" />{oferta.usuariosIncluidos} usuários incluídos</li>
            <li><Check size={15} aria-hidden="true" />Participação nas melhorias, pontos e benefícios</li>
          </ul>
        </aside>
      </section>

      <ul className={styles.strip} aria-label="Destaques do programa">
        <li><Users size={18} aria-hidden="true" /><span><b>Até {oferta.limiteEmpresas}</b> empresas</span></li>
        <li><Layers size={18} aria-hidden="true" /><span>Plano <b>{oferta.planoIncluido}</b></span></li>
        <li><Sparkles size={18} aria-hidden="true" /><span><b>{oferta.usuariosIncluidos}</b> usuários incluídos</span></li>
      </ul>

      <section className={styles.section} aria-labelledby="beneficios">
        <span className={styles.eyebrow}>O QUE VOCÊ RECEBE</span>
        <h2 id="beneficios">Mais do que uma assinatura.</h2>
        <div className={styles.benefits}>
          {beneficios.map((b, i) => (
            <article key={b.titulo}>
              <span className={styles.num}>{String(i + 1).padStart(2, "0")}</span>
              <h3>{b.titulo}</h3>
              <p>{b.texto}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.section} aria-labelledby="como-funciona">
        <span className={styles.eyebrow}>COMO FUNCIONA</span>
        <h2 id="como-funciona">Uma conversa é o primeiro passo.</h2>
        <ol className={styles.steps}>
          {etapas.map(([titulo, texto]) => (
            <li key={titulo}><h3>{titulo}</h3><p>{texto}</p></li>
          ))}
        </ol>
      </section>

      <section className={`${styles.section} ${styles.points}`} aria-labelledby="pontos">
        <div>
          <span className={styles.eyebrow}>PONTOS E RECOMPENSAS</span>
          <h2 id="pontos">Participar tem valor. E regras claras.</h2>
          <p>O catálogo informa condições e disponibilidade de cada recompensa.</p>
        </div>
        <ul>{regras.map((r) => <li key={r}>{r}</li>)}</ul>
      </section>

      <section className={`${styles.section} ${styles.faq}`} aria-labelledby="faq">
        <span className={styles.eyebrow}>PERGUNTAS FREQUENTES</span>
        <h2 id="faq">Antes de começar.</h2>
        {perguntas.map(([titulo, texto]) => <details key={titulo}><summary>{titulo}</summary><p>{texto}</p></details>)}
      </section>

      <section className={styles.final}>
        <h2>Seu conhecimento do setor pode ajudar a construir um Glass Code ainda melhor.</h2>
        <Contato>Falar com a equipe</Contato>
      </section>

      <footer className={shell.footer}>
        <span>Glass Code · Software para o setor de vidro</span>
        <Link href="/planos">Conhecer os planos</Link>
      </footer>
    </main>
  );
}
