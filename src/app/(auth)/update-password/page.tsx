// app/update-password/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Eye, EyeOff, CheckCircle } from "lucide-react"; // 🔥 Importado CheckCircle
import Image from "next/image";

export default function UpdatePasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [checkingSession, setCheckingSession] = useState(true);
  // 🔥 ESTADO DO MODAL DE SUCESSO
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // 🔐 Validação força da senha
  const validatePassword = (pass: string) => {
    const minLength = pass.length >= 6; // 🔥 Ajustado para 6
    const hasUpper = /[A-Z]/.test(pass);
    const hasNumber = /[0-9]/.test(pass);
    const hasSpecial = /[!@#$%^&*(),.x":{}|<>]/.test(pass);

    if (!minLength) return "A senha deve ter no mínimo 6 caracteres.";
    if (!hasUpper) return "Inclua pelo menos uma letra maiúscula.";
    if (!hasNumber) return "Inclua pelo menos um número.";
    if (!hasSpecial) return "Inclua pelo menos um caractere especial.";

    return "";
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
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

    const { error } = await supabase.auth.updateUser({
      password,
    });

    if (error) {
      setErrorMsg(translateAuthError(error.message));
      setLoading(false);
      return;
    }

    // 🔥 AÇÃO: Mostrar modal de sucesso em vez de redirecionar imediatamente
    setShowSuccessModal(true);
    setLoading(false);
  };

  // 🔥 AÇÃO: Redirecionar após fechar o modal
  const handleCloseModal = async () => {
    setShowSuccessModal(false);
    await supabase.auth.signOut();
    router.push("/login?updated=true");
  };

 const translateAuthError = (message: string) => {
    // 🔥 MAPEAMENTO DO ERRO DO SUPABASE
    if (message === "New password should not be the same as the old password.") {
      return "A nova senha não pode ser igual à senha anterior.";
    }

    switch (message) {
      case "Invalid login credentials":
        return "Email ou senha inválidos.";
      case "Email not confirmed":
        return "Confirme seu email antes de acessar.";
      default:
        return "Erro ao atualizar senha. Tente novamente.";
    }
  };

  useEffect(() => {
    const handleRecoverySession = async () => {
      const { data, error } = await supabase.auth.getSession();

      if (!data.session || error) {
        router.push("/login");
        return;
      }

      setCheckingSession(false);
    };

    handleRecoverySession();
  }, [router]);

  if (checkingSession) return null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface p-4">
      <div className="bg-surface p-10 rounded-3xl shadow-2xl w-full max-w-md border border-border-strong/10">

        {/* Logo */}
        <div className="flex justify-center mb-6">
          <Image
            src="/glasscode-light.png"
            alt="Logo"
            width={280}
            height={80}
            className="object-contain"
          />
        </div>

        <h2 className="text-2xl font-bold text-text-primary text-center">
          Redefinir Senha
        </h2>

        <p className="text-sm text-text-primary/70 text-center mt-2 mb-6">
          Crie uma nova senha segura para acessar sua conta.
        </p>

        <form onSubmit={handleUpdatePassword} className="space-y-5">
          {/* Inputs de Senha (permanecem iguais) */}
          <div>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Nova senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-border-strong/15 rounded-xl text-sm focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-text-secondary hover:text-text-secondary"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div className="relative">
            <input
              type={showConfirmPassword ? "text" : "password"}
              placeholder="Confirmar nova senha"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-3 border border-border-strong/15 rounded-xl text-sm focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all"
              required
            />
            <p className="mt-2 text-xs text-text-primary/50 leading-relaxed">
              A senha deve ter pelo menos 6 caracteres, incluindo letra maiúscula,
              número e caractere especial.
            </p>
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-3 text-text-primary/50 hover:text-selection-text"
            >
              {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          {errorMsg && (
            <div className="bg-danger/10 border border-danger/30 text-danger text-xs p-3 rounded-xl">
              {errorMsg}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary hover:bg-primary text-on-primary py-3 rounded-xl font-bold text-sm transition-all active:scale-95 disabled:opacity-70"
          >
            {loading ? "Atualizando..." : "Atualizar Senha"}
          </button>
        </form>
      </div>

      {/* --- 🔥 MODAL DE SUCESSO --- */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-navigation/30 backdrop-blur-sm"
            onClick={handleCloseModal}
          />
          <div className="relative bg-surface rounded-3xl p-8 shadow-2xl w-full max-w-sm border border-border text-center">
            <div className="flex justify-center mb-5">
              <div className="w-16 h-16 flex items-center justify-center rounded-full bg-primary/10">
                <CheckCircle className="text-selection-text" size={32} strokeWidth={2.5} />
              </div>
            </div>
            <h3 className="text-xl font-bold text-text-primary">
              Senha Atualizada!
            </h3>
            <p className="text-sm text-text-primary/70 mt-3 leading-relaxed">
              Sua senha foi redefinida com sucesso. Faça login novamente para acessar o sistema.
            </p>
            <button
              onClick={handleCloseModal}
              className="mt-8 w-full bg-primary hover:bg-primary text-on-primary py-3 rounded-xl text-sm font-semibold transition-all active:scale-95"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
