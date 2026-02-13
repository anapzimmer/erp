// app/senha-reset/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Eye, EyeOff } from "lucide-react";
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

  // 🔐 Validação força da senha
  const validatePassword = (pass: string) => {
    const minLength = pass.length >= 8;
    const hasUpper = /[A-Z]/.test(pass);
    const hasNumber = /[0-9]/.test(pass);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(pass);

    if (!minLength) return "A senha deve ter no mínimo 8 caracteres.";
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
  return;
}

    await supabase.auth.signOut();
    router.push("/login?updated=true");

  };

  const translateAuthError = (message: string) => {
  switch (message) {
    case "Invalid login credentials":
      return "Email ou senha inválidos.";
    case "Email not confirmed":
      return "Confirme seu email antes de acessar.";
    default:
      return "Erro ao autenticar. Tente novamente.";
  }
};


  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();

      if (!data.session) {
        router.push("/login");
        return;
      }

      setCheckingSession(false);
    };

    checkSession();
  }, [router]);

  if (checkingSession) return null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="bg-white p-10 rounded-3xl shadow-2xl w-full max-w-md border border-gray-100">

        {/* Logo */}
        <div className="flex justify-center mb-6">
          <Image
            src="/glasscode.png"
            alt="Logo"
            width={280}
            height={80}
            className="object-contain"
          />
        </div>

        <h2 className="text-2xl font-bold text-[#1C415B] text-center">
          Redefinir Senha
        </h2>

        <p className="text-sm text-gray-500 text-center mt-2 mb-6">
          Crie uma nova senha segura para acessar sua conta.
        </p>

        <form onSubmit={handleUpdatePassword} className="space-y-5">

          {/* Nova senha */}
          <div>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Nova senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#92D050] focus:border-[#92D050] outline-none transition-all"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

          </div>

          {/* Confirmar senha */}
          <div className="relative">
            <input
              type={showConfirmPassword ? "text" : "password"}
              placeholder="Confirmar nova senha"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#92D050] focus:border-[#92D050] outline-none transition-all"
              required
            />

            {/* Dica de senha */}
            <p className="mt-2 text-xs text-gray-400 leading-relaxed">
              A senha deve ter pelo menos 8 caracteres, incluindo letra maiúscula,
              número e caractere especial.
            </p>
            <button
              type="button"
              onClick={() =>
                setShowConfirmPassword(!showConfirmPassword)
              }
              className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
            >
              {showConfirmPassword ? (
                <EyeOff size={18} />
              ) : (
                <Eye size={18} />
              )}
            </button>
          </div>

          {errorMsg && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-xs p-3 rounded-xl">
              {errorMsg}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#1C415B] hover:bg-[#39b89f] text-white py-3 rounded-xl font-bold text-sm transition-all active:scale-95 disabled:opacity-70"
          >
            {loading ? "Atualizando..." : "Atualizar Senha"}
          </button>
        </form>
      </div>
    </div>
  );
}
