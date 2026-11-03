
"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CreditCard,
  ShieldCheck,
} from "lucide-react";

import { supabase } from "@/lib/supabaseClient";
import {
  precosPlanosCentavos,
  moedaComercial,
} from "@/config/comercial";
import CarregamentoAcesso from "@/components/CarregamentoAcesso";
import styles from "./contratar.module.css";

const planos = [
  {
    id: "essencial",
    nome: "Essencial",
    descricao: "O essencial para organizar sua operação.",
  },
  {
    id: "profissional",
    nome: "Profissional",
    descricao: "Mais controle para sua empresa crescer.",
  },
  {
    id: "completo",
    nome: "Completo",
    descricao: "Toda a potência do Glass Code.",
  },
] as const;

type Plano = (typeof planos)[number]["id"];
type Pagamento = "PIX" | "CREDIT_CARD" | "BOLETO";

type RespostaPagamento = {
  url?: string;
  erro?: string;
  mensagem?: string;
  reutilizado?: boolean;
};

export default function ContratarPage() {
  const router = useRouter();

  const [verificando, setVerificando] = useState(true);
  const [empresaAutorizada, setEmpresaAutorizada] = useState(false);
  const [erroContratacao, setErroContratacao] = useState<string | null>(null);

  const [plano, setPlano] = useState<Plano>("essencial");
  const [pagamento, setPagamento] = useState<Pagamento>("CREDIT_CARD");

  const [processandoPagamento, setProcessandoPagamento] = useState(false);

  useEffect(() => {
    let ativo = true;

    async function verificarContratacao() {
      try {
        const { data, error } = await supabase.auth.getSession();

        if (!ativo) return;

        if (error || !data.session?.access_token) {
          router.replace("/login");
          return;
        }

        const resposta = await fetch("/api/asaas/minha-empresa", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${data.session.access_token}`,
          },
          cache: "no-store",
        });

        if (!ativo) return;

        if (resposta.status === 401) {
          router.replace("/login");
          return;
        }

        if (!resposta.ok) {
          setErroContratacao(
            resposta.status === 403
              ? "Seu usuário não tem autorização para contratar um plano."
              : "Não foi possível validar sua empresa. Tente novamente."
          );
          return;
        }

        const resultado: {
          autorizado?: boolean;
          empresaId?: string;
        } = await resposta.json();

        if (!ativo) return;

        if (resultado.autorizado && resultado.empresaId) {
          setEmpresaAutorizada(true);
          setErroContratacao(null);
          
        } else {
          setErroContratacao(
            "Não foi possível identificar a empresa responsável pela contratação."
          );
        }
      } catch {
        if (ativo) {
          setErroContratacao(
            "Erro de comunicação ao validar sua empresa."
          );
        }
      } finally {
        if (ativo) {
          setVerificando(false);
        }
      }
    }

    void verificarContratacao();

    return () => {
      ativo = false;
    };
  }, [router]);

  async function continuarPagamento() {
    setErroContratacao(null);

    if (processandoPagamento || !empresaAutorizada) {
      return;
    }

    if (pagamento === "PIX") {
      setErroContratacao("Pix ainda não está disponível.");
      return;
    }

    setProcessandoPagamento(true);

    try {
      const { data, error } = await supabase.auth.getSession();

      if (error || !data.session?.access_token) {
        router.replace("/login");
        return;
      }

      const resposta = await fetch(
        pagamento === "BOLETO"
          ? "/api/asaas/contratar-boleto"
          : "/api/asaas/contratar",
        {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${data.session.access_token}`,
        },
        cache: "no-store",
        body: JSON.stringify({
          plano,
          pagamento,
        }),
        }
      );

      const resultado: RespostaPagamento = await resposta.json();

      if (!resposta.ok) {
        throw new Error(
          resultado.erro ||
            "Não foi possível iniciar o pagamento."
        );
      }

      if (resposta.status === 202) {
        setErroContratacao(
          resultado.mensagem ??
            "O Asaas está preparando sua cobrança. Consulte novamente em instantes."
        );
        return;
      }

      if (!resultado.url) {
        throw new Error(
          "O Asaas não retornou um endereço de pagamento."
        );
      }

      const destino = new URL(resultado.url);

      const dominiosPermitidos = [
        "asaas.com",
        "www.asaas.com",
        "sandbox.asaas.com",
      ];

      if (
        destino.protocol !== "https:" ||
        !dominiosPermitidos.includes(destino.hostname)
      ) {
        throw new Error(
          "O endereço de pagamento retornado não é autorizado."
        );
      }

      window.location.assign(destino.href);
    } catch (erro) {
      setErroContratacao(
        erro instanceof Error
          ? erro.message
          : "Erro inesperado ao iniciar o pagamento."
      );
    } finally {
      setProcessandoPagamento(false);
    }
  }

  if (verificando) {
    return <CarregamentoAcesso sucesso={false} />;
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link href="/glasscode" className={styles.brand}>
          <Image
            src="/glasscode-icon.svg"
            alt=""
            width={28}
            height={42}
          />
          <span>
            Glass <span className={styles.brandLight}>Code</span>
          </span>
        </Link>

        <span className={styles.headerNote}>
          <ShieldCheck size={15} />
          Contratação segura
        </span>
      </header>

      <div className={styles.container}>
        <div className={styles.intro}>
          <span className={styles.eyebrow}>
            <span />
            ESCOLHA SEU PRÓXIMO PASSO
          </span>

          <h1>
            O plano certo para sua próxima <em>conquista.</em>
          </h1>

          <p>
            Encontre a solução ideal para sua empresa e tenha
            os recursos certos para crescer.
          </p>

          <span className={styles.sandbox}>
            AMBIENTE DE TESTES · SEM COBRANÇAS REAIS
          </span>
        </div>

        {erroContratacao && (
          <p role="alert" className={styles.pending}>
            {erroContratacao}
          </p>
        )}

        {empresaAutorizada && (
          <p className={styles.authorization}>
            <ShieldCheck size={16} />
            Empresa identificada e autorizada para contratação.
          </p>
        )}

        <section
          className={styles.plans}
          aria-label="Escolha seu plano"
        >
          {planos.map((item) => {
            const selecionado = plano === item.id;

            return (
              <button
                key={item.id}
                type="button"
                aria-pressed={selecionado}
                disabled={processandoPagamento}
                onClick={() => {
                  setPlano(item.id);
                  setErroContratacao(null);
                }}
                className={`${styles.plan} ${
                  selecionado ? styles.selected : ""
                }`}
              >
                <div className={styles.planTop}>
                  <h2>{item.nome}</h2>
                  <span className={styles.check}>
                    {selecionado && <Check size={16} />}
                  </span>
                </div>

                <p>{item.descricao}</p>

                <div className={styles.price}>
                  {moedaComercial(
                    precosPlanosCentavos[item.id]
                  )}
                  <span>/ mês</span>
                </div>

                <span className={styles.planFooter}>
                  {selecionado
                    ? "Plano selecionado"
                    : "Selecionar plano"}
                  <ArrowRight size={15} />
                </span>
              </button>
            );
          })}
        </section>

        <section className={styles.checkout}>
          <div className={styles.checkoutGrid}>
            <div className={styles.checkoutLeft}>
              <div className={styles.checkoutIntro}>
                <span className={styles.step}>
                  02 / PAGAMENTO SEGURO
                </span>
                <h2>Finalize sua contratação</h2>
                <p>
                  Escolha a forma de pagamento para continuar.
                </p>
              </div>

              <div className={styles.paymentOptions}>
                <button
                  type="button"
                  aria-pressed={pagamento === "PIX"}
                  disabled
                  onClick={() => setPagamento("PIX")}
                  className={`${styles.paymentOption} ${
                    pagamento === "PIX"
                      ? styles.paymentSelected
                      : ""
                  }`}
                >
                  <span className={styles.paymentIcon}>
                    ◆
                  </span>
                  <span>Pix (em breve)</span>
                  {pagamento === "PIX" && (
                    <Check size={16} />
                  )}
                </button>

                <button
                  type="button"
                  aria-pressed={
                    pagamento === "CREDIT_CARD"
                  }
                  disabled={processandoPagamento}
                  onClick={() =>
                    setPagamento("CREDIT_CARD")
                  }
                  className={`${styles.paymentOption} ${
                    pagamento === "CREDIT_CARD"
                      ? styles.paymentSelected
                      : ""
                  }`}
                >
                  <CreditCard size={19} />
                  <span>Cartão de crédito</span>
                  {pagamento === "CREDIT_CARD" && (
                    <Check size={16} />
                  )}
                </button>

                
<button
  type="button"
  aria-pressed={pagamento === "BOLETO"}
  disabled={processandoPagamento}
  onClick={() => {
    setPagamento("BOLETO");
    setErroContratacao(null);
  }}
  className={`${styles.paymentOption} ${
    pagamento === "BOLETO"
      ? styles.paymentSelected
      : ""
  }`}
>
  <span className={styles.paymentIcon}>▤</span>
  <span>Boleto bancário</span>
  {pagamento === "BOLETO" && <Check size={16} />}
</button>

              </div>

            </div>

            <div className={styles.checkoutRight}>
              <div className={styles.summary}>
                <span>RESUMO DA CONTRATAÇÃO</span>

                <div>
                  <strong>
                    Plano{" "}
                    {
                      planos.find(
                        (item) => item.id === plano
                      )?.nome
                    }
                  </strong>

                  <strong>
                    {moedaComercial(
                      precosPlanosCentavos[plano]
                    )}
                  </strong>
                </div>

                <small>
                  Mensalidade ·{" "}
                 {pagamento === "PIX"
  ? "Pix"
  : pagamento === "BOLETO"
    ? "Boleto bancário · 1º vencimento em 3 dias"
    : "Cartão"}
                </small>
              </div>

              <button
                type="button"
                disabled={
                  !empresaAutorizada ||
                  processandoPagamento
                }
                className={styles.payButton}
                onClick={() =>
                  void continuarPagamento()
                }
              >
                {processandoPagamento
                  ? "Preparando pagamento..."
                  : "Continuar para pagamento"}

                <ArrowRight size={18} />
              </button>

              <p className={styles.pending}>
                Ambiente de testes Asaas Sandbox.
                Nenhuma cobrança real será realizada.
              </p>
            </div>
          </div>

          <div className={styles.secure}>
            <ShieldCheck size={16} />
            Integração protegida com o Asaas Sandbox
          </div>
        </section>

        <Link
          href="/planos"
          className={styles.back}
        >
          <ArrowLeft size={16} />
          Comparar recursos dos planos
        </Link>
      </div>

      <footer className={styles.footer}>
        <span>
          SOFTWARE PARA O SETOR DE VIDRO
        </span>

        <span>
          Gestão · Projetos · Resultados
        </span>
      </footer>
    </main>
  );
}
