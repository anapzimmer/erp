"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function UpdatePasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.updateUser({
      password,
    });

    if (error) {
      alert(error.message);
      setLoading(false);
      return;
    }

    alert("Senha alterada com sucesso!");
    router.push("/login");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="bg-white p-8 rounded-3xl shadow-xl w-full max-w-sm">
        <h2 className="text-2xl font-bold text-[#1C415B] mb-6 text-center">
          Nova Senha
        </h2>

        <form onSubmit={handleUpdatePassword} className="space-y-4">
          <input
            type="password"
            placeholder="Digite sua nova senha"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#92D050] focus:border-[#92D050] outline-none transition-all"
            required
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#1C415B] text-white py-3 rounded-xl font-bold text-sm"
          >
            {loading ? "Atualizando..." : "Atualizar Senha"}
          </button>
        </form>
      </div>
    </div>
  );
}
