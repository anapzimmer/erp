"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Eye, EyeOff } from "lucide-react";

export default function UpdatePasswordPage() {
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // 🔐 Validação força da senha
  const validatePassword = (pass: string) => {
    const minLength = pass.length >= 8;
    const hasUpper = /[A-Z]/.test(pass);
    const hasNumber = /[0-9]/.test(pass);

    if (!minLength) return "A senha precisa ter no mínimo 8 caracteres.";
    if (!hasUpper) return "A senha precisa ter pelo menos uma letra maiúscula.";
    if (!hasNumber) return "A senha precisa ter pelo menos um número.";

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
      setErrorMsg(error.message);
      setLoading(false);
      return;
    }

    // 🔓 Auto login já acontece porque o token do email cria sessão
    router.push("/");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="bg-white p-10 rounded-3xl shadow-2xl w-full max-w-md border border-gray-100">

        <h2 className="text-2xl font-bold text-[#1C415B] mb-2 text-center">
          Criar nova senha
        </h2>

        <p className="text-sm text-gray-500 text-center mb-6">
          Sua conta está protegida. Defina uma nova senha segura.
        </p>

        <form onSubmit={handleUpdatePassword} className="space-y-5">
          
          {/* Nova senha */}
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
              className="absolute right-3 top-3 text-gray-400"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          {/* Confirmar senha */}
          <input
            type="password"
            placeholder="Confirmar nova senha"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#92D050] focus:border-[#92D050] outline-none transition-all"
            required
          />

          {errorMsg && (
            <p className="text-red-500 text-xs">{errorMsg}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#1C415B] hover:bg-[#39b89f] text-white py-3 rounded-xl font-bold text-sm transition-all active:scale-95"
          >
            {loading ? "Atualizando..." : "Atualizar Senha"}
          </button>
        </form>
      </div>
    </div>
  );
}
