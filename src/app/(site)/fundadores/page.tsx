import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowDown, BadgeCheck, Building2, Check, Clock, Gift, Layers, MessageSquareText, Users, Vote,
} from "lucide-react";
import { foundersComercial as oferta, moedaComercial } from "@/config/foundersComercial";
import { recursosCompleto } from "@/config/comercial";
import shell from "../planos/planos.module.css";
import styles from "./fundadores.module.css";

export const metadata: Metadata = {
  title: "Parceiros Fundadores",
  description: "Conheça o Programa Parceiros Fundadores do Glass Code: primeira turma de até 30 empresas, recursos do plano Completo, três usuários, votações consultivas e pontos por contribuições reconhecidas.",
  alternates: { canonical: "https://www.glasscode.com.br/fundadores" },
  openGraph: {
    title: "Parceiros Fundadores | Glass Code",
    description: "O futuro do Glass Code também pode ter a sua assinatura. Primeira turma de até 30 empresas.",
    url: "https://www.glasscode.com.br/fundadores",
    type: "website",
  },
};

const beneficios = [
  { icon: Layers, titulo: "Sistema completo", texto: `Acesso aos recursos previstos no plano ${oferta.planoIncluido}, com ${oferta.usuariosIncluidos} usuários por empresa.` },
  { icon: MessageSquareText, titulo: "Participação na evolução", texto: "Envie sugestões e participe das votações consultivas que ajudam a orientar melhorias." },
  { icon: Gift, titulo: "Pontos e benefícios", texto: "Contribuições reconhecidas podem gerar pontos para resgate de recompensas conforme as regras do programa." },
];

const detalhes = [
  { titulo: "Para quem foi criado e quem pode participar", conteudo: `Para vidraçarias e empresas do setor vidreiro que querem um sistema completo de orçamentos e projetos e desejam contribuir com a experiência da sua operação. A primeira turma comporta até ${oferta.limiteEmpresas} empresas, e a equipe confirma elegibilidade e vaga antes de qualquer contratação.` },
];

const disponiveis = [
  "Recursos equivalentes ao plano Completo",
  `${oferta.usuariosIncluidos} usuários incluídos por empresa`,
  "Identificação como parceiro fundador",
  "Painel Founders para parceiros habilitados: contribuições, votações e saldo de pontos",
];
const emPreparacao = [
  "Catálogo de recompensas e descontos",
  "Resgates de pontos, sujeitos a catálogo, saldo, regras e aprovação",
  "Acesso antecipado a recursos selecionados, quando disponibilizados",
  "Adesão e pagamento online",
];

const fluxo = [
  { titulo: "Sugestão enviada", texto: "A empresa registra uma necessidade real da operação.", linha: "Sugestão de melhoria", estado: "Enviada" },
  { titulo: "Análise da equipe", texto: "A equipe avalia o contexto. Analisar não garante implementar.", linha: "Análise da equipe", estado: "Em triagem" },
  { titulo: "Contribuição reconhecida", texto: "Quando faz sentido, a contribuição é reconhecida.", linha: "Contribuição", estado: "Aprovada" },
  { titulo: "Pontos registrados", texto: "Os pontos entram no saldo da empresa.", linha: "Saldo de pontos", estado: "Atualizado" },
  { titulo: "Solicitação de benefício", texto: "A empresa solicita uma recompensa do catálogo, sujeita a aprovação.", linha: "Benefício", estado: "Solicitado" },
];

const regras = [
  `Descontos de mensalidade somente após as ${oferta.mensalidadesPagasPromocionais} primeiras mensalidades pagas.`,
  "Um desconto por ciclo, sem acumular vários resgates.",
  "Pontos não são dinheiro, não são transferíveis entre empresas e não geram saldo negativo.",
  "Não há redução automática de cobrança. O catálogo informa as regras de cada recompensa.",
];

const etapas = [
  ["Conheça o programa", "Leia as condições nesta página."],
  ["Confirme a disponibilidade", "A equipe verifica elegibilidade e vaga."],
  ["Aceite as condições", "Termos da contratação paga."],
  ["Comece a utilizar", "Após a habilitação, use o sistema."],
  ["Participe e acumule pontos", "Pelo painel Founders."],
  ["Resgate benefícios", "Conforme catálogo, saldo e aprovação."],
];

const perguntas = [
  ["O sistema está em desenvolvimento?", "Sim. O Glass Code evolui continuamente. Os recursos disponíveis e os que estão em preparação aparecem separados nesta página. A participação permite compartilhar necessidades, mas não garante implementação de sugestões ou prazos de entrega."],
  ["O período promocional é um teste gratuito?", `Não. As ${oferta.mensalidadesPagasPromocionais} primeiras mensalidades são pagas, com valor promocional.`],
  ["O valor de fundador é vitalício?", `Não há promessa de preço vitalício. As condições são as descritas nesta página: ${moedaComercial(oferta.precoPromocionalCentavos)}/mês nas ${oferta.mensalidadesPagasPromocionais} primeiras mensalidades pagas e ${moedaComercial(oferta.precoRegularCentavos)}/mês a partir da ${oferta.mensalidadesPagasPromocionais + 1}ª mensalidade. Preços de tabela podem ser revistos no futuro.`],
  ["Qual é a diferença para o plano Completo?", "Os recursos do sistema são os mesmos previstos no Completo. O programa acrescenta condições comerciais próprias, participação consultiva, identificação de fundador e benefícios por contribuições reconhecidas, com limite de empresas."],
  ["Como funcionam as votações?", "São consultivas: ajudam a equipe a entender prioridades, mas não garantem que uma sugestão será implementada. Votar não gera pontos automaticamente."],
  ["Minha sugestão será desenvolvida?", "Toda sugestão é analisada, mas a implementação não é garantida. A participação não representa sociedade nem propriedade sobre o software."],
  ["Preciso contratar para participar?", "Sim. Após a confirmação de elegibilidade e vaga, a equipe apresenta as condições para aceite e contratação paga."],
];

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
          <span className={`${styles.eyebrow} ${styles.rise}`} style={{ "--i": 0 } as React.CSSProperties}>PROGRAMA PARCEIROS FUNDADORES</span>
          <h1 className={styles.rise} style={{ "--i": 1 } as React.CSSProperties}>O futuro do Glass Code também pode ter <em>a sua assinatura.</em></h1>
          <p className={`${styles.lead} ${styles.rise}`} style={{ "--i": 2 } as React.CSSProperties}>Use os recursos do plano Completo e participe da evolução do Glass Code com a experiência da sua vidraçaria. São até {oferta.limiteEmpresas} empresas, com condições comerciais próprias e diálogo próximo com a equipe.</p>
          <div className={`${styles.actions} ${styles.rise}`} style={{ "--i": 3 } as React.CSSProperties}>
            <a className={styles.cta} href="#programa">Conhecer o programa <ArrowDown size={16} aria-hidden="true" /></a>
            <a className={styles.link} href="#condicoes">Ver condições de participação</a>
          </div>
        </div>

        <div className={styles.glass}>
          <span className={`${styles.pane} ${styles.paneA}`} aria-hidden="true" />
          <span className={`${styles.pane} ${styles.paneB}`} aria-hidden="true" />
          <span className={`${styles.pane} ${styles.paneC}`} aria-hidden="true" />
          <aside className={styles.offer} aria-label="Condições comerciais">
            <span className={styles.offerLabel}>Primeira turma · por empresa</span>
            <div className={styles.price}>{moedaComercial(oferta.precoPromocionalCentavos)}<small>/mês</small></div>
            <p className={styles.offerNote}>nas {oferta.mensalidadesPagasPromocionais} primeiras mensalidades pagas</p>
            <div className={styles.then}>
              <span>A partir da {oferta.mensalidadesPagasPromocionais + 1}ª mensalidade</span>
              <strong>{moedaComercial(oferta.precoRegularCentavos)}/mês</strong>
            </div>
            <p className={styles.offerMeta}><Layers size={16} aria-hidden="true" />Plano {oferta.planoIncluido} + {oferta.usuariosIncluidos} usuários</p>
          </aside>
        </div>
      </section>

      <ul className={styles.strip} aria-label="Destaques do programa">
        <li><Building2 size={18} aria-hidden="true" /><span><b>Até {oferta.limiteEmpresas}</b> empresas</span></li>
        <li><Layers size={18} aria-hidden="true" /><span>Plano <b>{oferta.planoIncluido}</b></span></li>
        <li><Users size={18} aria-hidden="true" /><span><b>{oferta.usuariosIncluidos}</b> usuários incluídos</span></li>
      </ul>

      <section className={styles.section} id="programa" aria-labelledby="t-programa">
        <span className={styles.eyebrow}>O PROGRAMA</span>
        <h2 id="t-programa">Muito mais que um software. Uma parceria de evolução.</h2>
        <div className={`${styles.cols} ${styles.reveal}`}>
          {beneficios.map(({ icon: Icon, titulo, texto }) => (
            <article key={titulo}>
              <span className={styles.icon}><Icon size={20} aria-hidden="true" /></span>
              <h3>{titulo}</h3>
              <p>{texto}</p>
            </article>
          ))}
        </div>

        <div className={`${styles.acc} ${styles.more}`}>
          {detalhes.map((d) => <details key={d.titulo}><summary>{d.titulo}</summary><p>{d.conteudo}</p></details>)}
          <details>
            <summary>Funcionalidades do plano {oferta.planoIncluido}</summary>
            <p>Inclui os recursos dos planos Essencial e Profissional, além dos exclusivos do Completo:</p>
            <ul className={styles.list}>{recursosCompleto.map((r) => <li key={r}>{r}</li>)}</ul>
          </details>
          <details>
            <summary>O que já existe e o que depende de lançamento</summary>
            <div className={styles.status}>
              <div>
                <h3><Check size={16} aria-hidden="true" /> Já faz parte do programa</h3>
                <ul className={styles.list}>{disponiveis.map((d) => <li key={d}>{d}</li>)}</ul>
              </div>
              <div>
                <h3><Clock size={16} aria-hidden="true" /> Depende de lançamento</h3>
                <ul className={styles.list}>{emPreparacao.map((d) => <li key={d}>{d}</li>)}</ul>
              </div>
            </div>
          </details>
        </div>
      </section>

      <section className={styles.section} id="participacao" aria-labelledby="t-participacao">
        <span className={styles.eyebrow}>PARTICIPAÇÃO NAS MELHORIAS</span>
        <h2 id="t-participacao">Sua experiência ajuda a construir o próximo Glass Code.</h2>

        <div className={`${styles.flow} ${styles.reveal}`}>
          <fieldset className={styles.flowSteps}>
            <legend className={styles.srOnly}>Escolha uma etapa para ver o exemplo</legend>
            {fluxo.map((f, i) => (
              <div key={f.titulo} className={styles.flowStep}>
                <input type="radio" name="fluxo" id={`f${i + 1}`} defaultChecked={i === 0} className={styles.srOnly} />
                <label htmlFor={`f${i + 1}`}>
                  <span className={styles.flowNum}>{i + 1}</span>
                  <span><b>{f.titulo}</b><small>{f.texto}</small></span>
                </label>
              </div>
            ))}
          </fieldset>

          <div className={styles.mock} aria-label="Exemplo ilustrativo do painel Founders">
            <div className={styles.mockBar}>
              <span className={styles.tag}>Ilustrativo</span>
              <span>Painel Founders · exemplo sem dados reais</span>
            </div>
            <ul className={styles.rows}>
              {fluxo.map((f) => (
                <li key={f.titulo}>
                  <span className={styles.dot} aria-hidden="true" />
                  <span>{f.linha}</span>
                  <em>{f.estado}</em>
                </li>
              ))}
            </ul>
            <div className={styles.meterWrap}>
              <span>Saldo de pontos (ilustrativo, sem valores oficiais)</span>
              <div className={styles.meter} role="img" aria-label="Barra ilustrativa de saldo, sem valores reais"><span className={styles.meterFill} /></div>
            </div>
          </div>
        </div>

        <ul className={styles.notes}>
          <li><Vote size={16} aria-hidden="true" />Votações são consultivas: orientam prioridades, sem garantir implementação. Votar não gera pontos automaticamente.</li>
          <li><BadgeCheck size={16} aria-hidden="true" />A análise da equipe não garante que a sugestão será desenvolvida.</li>
        </ul>

        <div className={`${styles.acc} ${styles.more}`}>
          <details>
            <summary>Regras de pontos e resgates</summary>
            <ul className={styles.list}>{regras.map((r) => <li key={r}>{r}</li>)}</ul>
          </details>
        </div>
      </section>

      <section className={styles.section} id="como-funciona" aria-labelledby="t-como">
        <span className={styles.eyebrow}>DA ADESÃO AO USO</span>
        <h2 id="t-como">Seis etapas, da primeira leitura ao resgate.</h2>
        <ol className={styles.timeline}>
          {etapas.map(([titulo, texto]) => (
            <li key={titulo} className={styles.step}><h3>{titulo}</h3><p>{texto}</p></li>
          ))}
        </ol>
      </section>

      <section className={styles.section} id="condicoes" aria-labelledby="t-condicoes">
        <span className={styles.eyebrow}>CONDIÇÕES DE PARTICIPAÇÃO</span>
        <h2 id="t-condicoes">Quanto custa e como entrar.</h2>
        <dl className={`${styles.facts} ${styles.reveal}`}>
          <div><dt>Primeiras {oferta.mensalidadesPagasPromocionais} mensalidades pagas</dt><dd>{moedaComercial(oferta.precoPromocionalCentavos)}<small>/mês</small></dd></div>
          <div><dt>A partir da {oferta.mensalidadesPagasPromocionais + 1}ª mensalidade</dt><dd>{moedaComercial(oferta.precoRegularCentavos)}<small>/mês</small></dd></div>
          <div><dt>Primeira turma</dt><dd>Até {oferta.limiteEmpresas}<small> empresas</small></dd></div>
          <div><dt>Incluídos</dt><dd>{oferta.usuariosIncluidos}<small> usuários</small></dd></div>
        </dl>
        <div className={styles.entry}>
          <ul className={styles.list}>
            <li>Valores por empresa. O período promocional é pago, não é teste gratuito.</li>
            <li>Contratação sujeita à elegibilidade e à disponibilidade de vaga, confirmadas pela equipe.</li>
            <li>Sem promessa de preço vitalício. Ao preencher as {oferta.limiteEmpresas} vagas, a primeira turma é encerrada.</li>
          </ul>
          <div className={styles.soon} role="status">
            <BadgeCheck size={18} aria-hidden="true" />
            <div>
              <b>Adesão online em preparação</b>
              <span>Ainda não há formulário, pagamento ou ativação automática nesta página. Quando for liberada, será anunciada aqui.</span>
            </div>
          </div>
        </div>
      </section>

      <section className={`${styles.section} ${styles.faq}`} aria-labelledby="faq">
        <span className={styles.eyebrow}>PERGUNTAS FREQUENTES</span>
        <h2 id="faq">Antes de decidir.</h2>
        <div className={styles.acc}>
          {perguntas.map(([titulo, texto]) => <details key={titulo}><summary>{titulo}</summary><p>{texto}</p></details>)}
        </div>
      </section>

      <section className={styles.final}>
        <h2>Seu conhecimento do setor pode ajudar a construir um Glass Code ainda melhor.</h2>
        <div className={styles.actions}>
          <a className={styles.cta} href="#condicoes">Ver condições de participação</a>
          <a className={styles.link} href="#participacao">Como a participação funciona</a>
        </div>
      </section>

      <footer className={shell.footer}>
        <span>Glass Code · Software para o setor de vidro</span>
        <Link href="/planos">Conhecer os planos</Link>
      </footer>
    </main>
  );
}
