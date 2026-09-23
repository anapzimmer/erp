"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  ArrowRight,
  Check,
  CheckCircle,
  Eye,
  EyeOff,
  LockKeyhole,
} from "lucide-react";

import { supabase } from "@/lib/supabaseClient";
import { useTheme } from "@/context/ThemeContext";

export default function RecuperarSenhaPage() {
  const router = useRouter();
  const { resolvedMode } = useTheme();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  const [errorMsg, setErrorMsg] = useState("");
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const requirements = {
    length: password.length >= 6,
    uppercase: /[A-Z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[!@#$%^&*(),.?":{}|<>_\-+=/\\[\];'`~]/.test(password),
  };

  const validatePassword = (pass: string) => {
    if (pass.length < 6) {
      return "A senha deve ter no mínimo 6 caracteres.";
    }

    if (!/[A-Z]/.test(pass)) {
      return "Inclua pelo menos uma letra maiúscula.";
    }

    if (!/[0-9]/.test(pass)) {
      return "Inclua pelo menos um número.";
    }

    if (!/[!@#$%^&*(),.?":{}|<>_\-+=/\\[\];'`~]/.test(pass)) {
      return "Inclua pelo menos um caractere especial.";
    }

    return "";
  };

 const translateAuthError = (message: string) => {
  const normalizedMessage = message.toLowerCase();

  if (
    normalizedMessage.includes("same as the old password") ||
    normalizedMessage.includes("different from the old password") ||
    normalizedMessage.includes("new password should be different")
  ) {
    return "Essa senha já foi utilizada anteriormente. Crie uma senha diferente da sua senha atual.";
  }

  if (
    normalizedMessage.includes("expired") ||
    normalizedMessage.includes("otp_expired") ||
    normalizedMessage.includes("invalid token") ||
    normalizedMessage.includes("session missing")
  ) {
    return "Este link de recuperação expirou ou não é mais válido. Solicite um novo link para redefinir sua senha.";
  }

  return "Não foi possível atualizar sua senha. Tente novamente.";
};

  const handleUpdatePassword = async (
    e: React.FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();
    setErrorMsg("");

    const validationError = validatePassword(password);

    if (validationError) {
      setErrorMsg(validationError);
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg("As senhas não coincidem.");
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password,
      });

      if (error) {
        setErrorMsg(translateAuthError(error.message));
        return;
      }

      setShowSuccessModal(true);
    } finally {
      setLoading(false);
    }
  };

  const handleCloseModal = async () => {
    setShowSuccessModal(false);

    await supabase.auth.signOut();

    router.push("/login?updated=true");
    router.refresh();
  };

  useEffect(() => {
    let mounted = true;

    const checkRecoverySession = async () => {
      /*
       * Ao abrir o link enviado pelo Supabase, o cliente pode precisar
       * de um instante para processar a sessão de recuperação.
       */
      await new Promise((resolve) => setTimeout(resolve, 500));

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!mounted) return;

      if (session) {
        setCheckingSession(false);
        return;
      }

      /*
       * O listener também cobre o momento em que o Supabase termina
       * de processar o link de recuperação.
       */
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((event, currentSession) => {
        if (!mounted) return;

        if (
          event === "PASSWORD_RECOVERY" ||
          (event === "SIGNED_IN" && currentSession)
        ) {
          setCheckingSession(false);
        }
      });

      window.setTimeout(async () => {
        if (!mounted) return;

        const {
          data: { session: finalSession },
        } = await supabase.auth.getSession();

        if (!finalSession) {
          subscription.unsubscribe();
          router.replace("/login");
        }
      }, 2500);
    };

    void checkRecoverySession();

    return () => {
      mounted = false;
    };
  }, [router]);

  if (checkingSession) {
    return (
      <main className="min-h-screen bg-[#38444B] flex items-center justify-center px-6">
        <div className="text-center">
          <Image
            src="/glasscode-dark.png"
            alt="Glass Code"
            width={180}
            height={70}
            priority
            unoptimized
            className="mx-auto object-contain"
          />

          <div className="mt-8 flex justify-center">
            <span className="block h-6 w-6 rounded-full border-2 border-white/20 border-t-[#C8D463] animate-spin" />
          </div>

          <p className="mt-4 text-sm text-white/55">
            Validando seu acesso...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F4F6F6] flex">
      {/* LADO INSTITUCIONAL */}
      <section className="hidden lg:flex lg:w-[46%] bg-[#38444B] relative overflow-hidden p-14 flex-col justify-between">
        <div
          className="absolute -right-32 -top-32 w-[440px] h-[440px] rounded-full border border-white/5"
          aria-hidden="true"
        />

        <div
          className="absolute -right-12 -top-12 w-[280px] h-[280px] rounded-full border border-white/5"
          aria-hidden="true"
        />

        <div className="relative z-10">
          <Image
            src="/glasscode-dark.png"
            alt="Glass Code"
            width={190}
            height={72}
            priority
            unoptimized
            className="object-contain"
          />
        </div>

        <div className="relative z-10 max-w-md">
          <span className="text-[11px] tracking-[0.24em] font-semibold text-[#C8D463]">
            SEGURANÇA DE ACESSO
          </span>

          <h1 className="mt-5 text-[42px] leading-[1.08] font-semibold tracking-[-0.04em] text-white">
            Seu trabalho continua.
            <br />
            <span className="text-white/45">
              Seu acesso também.
            </span>
          </h1>

          <p className="mt-6 text-[15px] leading-7 text-white/55 max-w-sm">
            Defina uma nova senha para voltar aos seus projetos,
            orçamentos e clientes no Glass Code.
          </p>
        </div>

        <div className="relative z-10 text-xs text-white/35">
          Glass Code · Gestão com clareza. Projetos com precisão.
        </div>
      </section>

      {/* FORMULÁRIO */}
      <section className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-[430px]">
          <div className="lg:hidden mb-10 flex justify-center">
            <Image
              src={
                resolvedMode === "dark"
                  ? "/glasscode-dark.png"
                  : "/glasscode-light.png"
              }
              alt="Glass Code"
              width={170}
              height={70}
              priority
              unoptimized
              className="object-contain"
            />
          </div>

          <div className="mb-8">
            <div className="w-12 h-12 rounded-2xl bg-[#38444B] flex items-center justify-center mb-6">
              <LockKeyhole
                size={21}
                className="text-[#C8D463]"
              />
            </div>

            <span className="text-[10px] tracking-[0.22em] font-bold text-[#8F9AA1]">
              RECUPERAÇÃO DE ACESSO
            </span>

            <h2 className="mt-3 text-[32px] leading-tight font-semibold tracking-[-0.035em] text-[#38444B]">
              Crie sua nova senha.
            </h2>

            <p className="mt-3 text-sm leading-6 text-[#8F9AA1]">
              Escolha uma senha segura para continuar usando
              o Glass Code.
            </p>
          </div>

          <form
            onSubmit={handleUpdatePassword}
            className="space-y-5"
          >
            <div>
              <label
                htmlFor="new-password"
                className="block text-xs font-semibold text-[#38444B] mb-2"
              >
                Nova senha
              </label>

              <div className="relative">
                <input
                  id="new-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Digite sua nova senha"
                  className="w-full h-12 rounded-xl border border-[#DCE2E4] bg-white px-4 pr-12 text-sm text-[#38444B] outline-none transition focus:border-[#8F9AA1] focus:ring-2 focus:ring-[#C8D463]/25"
                  required
                />

                <button
                  type="button"
                  aria-label={
                    showPassword
                      ? "Ocultar senha"
                      : "Mostrar senha"
                  }
                  onClick={() =>
                    setShowPassword((current) => !current)
                  }
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[#8F9AA1] hover:text-[#38444B]"
                >
                  {showPassword ? (
                    <EyeOff size={18} />
                  ) : (
                    <Eye size={18} />
                  )}
                </button>
              </div>
            </div>

            <div>
              <label
                htmlFor="confirm-password"
                className="block text-xs font-semibold text-[#38444B] mb-2"
              >
                Confirmar nova senha
              </label>

              <div className="relative">
                <input
                  id="confirm-password"
                  type={
                    showConfirmPassword ? "text" : "password"
                  }
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) =>
                    setConfirmPassword(e.target.value)
                  }
                  placeholder="Digite novamente"
                  className="w-full h-12 rounded-xl border border-[#DCE2E4] bg-white px-4 pr-12 text-sm text-[#38444B] outline-none transition focus:border-[#8F9AA1] focus:ring-2 focus:ring-[#C8D463]/25"
                  required
                />

                <button
                  type="button"
                  aria-label={
                    showConfirmPassword
                      ? "Ocultar senha"
                      : "Mostrar senha"
                  }
                  onClick={() =>
                    setShowConfirmPassword(
                      (current) => !current
                    )
                  }
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[#8F9AA1] hover:text-[#38444B]"
                >
                  {showConfirmPassword ? (
                    <EyeOff size={18} />
                  ) : (
                    <Eye size={18} />
                  )}
                </button>
              </div>
            </div>

            <div className="rounded-xl border border-[#DCE2E4] bg-white/70 p-4">
              <p className="text-[11px] font-semibold text-[#38444B] mb-3">
                Sua senha precisa ter:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <Requirement
                  ok={requirements.length}
                  text="6 caracteres"
                />
                <Requirement
                  ok={requirements.uppercase}
                  text="1 letra maiúscula"
                />
                <Requirement
                  ok={requirements.number}
                  text="1 número"
                />
                <Requirement
                  ok={requirements.special}
                  text="1 caractere especial"
                />
              </div>
            </div>

            {errorMsg && (
              <div
                role="alert"
                className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs leading-5 text-red-700"
              >
                {errorMsg}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-xl bg-[#38444B] text-white text-sm font-semibold flex items-center justify-center gap-2 transition hover:opacity-95 active:scale-[0.99] disabled:opacity-60"
            >
              {loading ? (
                <>
                  <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  Salvar nova senha
                  <ArrowRight size={17} />
                </>
              )}
            </button>
          </form>

          <p className="mt-8 text-center text-[11px] text-[#8F9AA1]">
            Glass Code · Acesso protegido
          </p>
        </div>
      </section>

{showSuccessModal && (
  <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-[#263238]/65 backdrop-blur-[6px] px-5">
    <div className="relative w-full max-w-[410px] overflow-hidden rounded-[28px] bg-[#38444B] shadow-2xl border border-white/10">

      {/* MARCA D'ÁGUA GLASS CODE */}
 <div
  className="pointer-events-none absolute inset-0 overflow-hidden rounded-[28px]"
  aria-hidden="true"
>
  {/* lâmina traseira cinza */}
  <div
    className="
      absolute
      -right-[18px]
      -top-[62px]
      w-[118px]
      h-[160px]
      rounded-[20px]
      border border-[#8F9AA1]/20
      rotate-[30deg]
    "
  />

  {/* lâmina frontal lima */}
  <div
    className="
      absolute
      -right-[48px]
      -top-[8px]
      w-[118px]
      h-[160px]
      rounded-[20px]
      border border-[#C8D463]/20
      rotate-[30deg]
    "
  />
</div>

      {/* CÍRCULOS TECNOLÓGICOS DISCRETOS */}
      <div
        className="pointer-events-none absolute -right-20 -top-20 w-52 h-52 rounded-full border border-white/[0.045]"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -right-8 -top-8 w-32 h-32 rounded-full border border-white/[0.045]"
        aria-hidden="true"
      />

      <div className="relative z-10 px-9 pt-10 pb-8 text-center">

        {/* ÍCONE DE SUCESSO */}
        <div className="mx-auto w-16 h-16 rounded-2xl bg-[#C8D463]/10 border border-[#C8D463]/20 flex items-center justify-center">
          <CheckCircle
            size={30}
            strokeWidth={2}
            className="text-[#C8D463]"
          />
        </div>

        <span className="mt-6 block text-[10px] tracking-[0.24em] font-bold text-[#C8D463]">
          ACESSO ATUALIZADO
        </span>

        <h3 className="mt-3 text-[27px] font-semibold tracking-[-0.035em] text-white">
          Senha alterada.
        </h3>

        <p className="mt-3 text-sm leading-6 text-white/55">
          Sua nova senha foi salva com sucesso.
          <br />
          Você já pode acessar o Glass Code.
        </p>

        <div className="my-7 h-px bg-white/[0.08]" />

        <button
          type="button"
          onClick={handleCloseModal}
          className="group w-full h-12 rounded-xl bg-[#C8D463] text-[#38444B] text-sm font-bold flex items-center justify-center gap-2 transition-all hover:brightness-105 active:scale-[0.99]"
        >
          Ir para o login

          <ArrowRight
            size={17}
            className="transition-transform group-hover:translate-x-1"
          />
        </button>

        <div className="mt-6 flex items-center justify-center gap-2">
          <LockKeyhole
            size={12}
            className="text-white/25"
          />

          <span className="text-[10px] tracking-wide text-white/30">
            Acesso protegido pelo Glass Code
          </span>
        </div>
      </div>
    </div>
  </div>
)}
    </main>
  );
}

function Requirement({
  ok,
  text,
}: {
  ok: boolean;
  text: string;
}) {
  return (
    <div className="flex items-center gap-2 text-[11px]">
      <span
        className={`w-4 h-4 rounded-full flex items-center justify-center ${
          ok
            ? "bg-[#C8D463] text-[#38444B]"
            : "bg-[#DCE2E4] text-[#8F9AA1]"
        }`}
      >
        <Check size={10} strokeWidth={3} />
      </span>

      <span
        className={
          ok ? "text-[#38444B]" : "text-[#8F9AA1]"
        }
      >
        {text}
      </span>
    </div>
  );
}