"use client";

import { useState } from 'react';
import { Mail, Lock, Eye, EyeOff, LogIn, X } from 'lucide-react';
import { useRouter } from 'next/navigation';

const LoginPage = () => {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const [modalConfig, setModalConfig] = useState({
    show: false,
    title: "",
    message: "",
    type: "error" as "error" | "success"
  });

  const showModal = (title: string, message: string, type: "error" | "success" = "error") => {
    setModalConfig({ show: true, title, message, type });
  };

const handleLogin = async (e: React.FormEvent) => {
  e.preventDefault();
  setLoading(true);

  try {
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      showModal("Falha na Autenticação", data.error || "Usuário ou senha incorretos");
      return;
    }

    // Login bem-sucedido: redireciona para Dashboard
    router.push("/");

  } catch (err) {
    setLoading(false);
    showModal("Falha na Autenticação", "Erro de conexão");
  }
};


  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">

      <div className="relative w-full max-w-md">
        {/* Logo sobre o card */}
        <div className="mb-6">
          <img
            src="/glasscode.png"
            alt="Glass Code Logo"
            className="h-28 w-auto object-contain"
          />
        </div>

        {/* Card de login */}
        <div className="w-full bg-white rounded-[2rem] shadow-2xl p-8 md:p-10 border border-gray-100 mt-16">

          <div className="mb-10 text-center">
            <h2 className="text-3xl font-black text-[#1C415B]">Bem-vindo</h2>
            <p className="text-gray-500 text-sm mt-2">
              Insira suas credenciais para acessar o sistema.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            {/* Input E-mail */}
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="email"
                placeholder="seuemail@empresa.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#92D050] focus:border-[#92D050] outline-none transition-all"
                required
              />
            </div>

            {/* Input Senha */}
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-12 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#92D050] focus:border-[#92D050] outline-none transition-all"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {/* Botão Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-[#1C415B] hover:bg-[#39b89f] text-white py-3 rounded-xl font-bold text-sm uppercase tracking-widest transition-all active:scale-95 disabled:opacity-70"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <LogIn size={18} />
                  Entrar
                </>
              )}
            </button>
          </form>
        </div>
      </div>

      {/* --- MODAL DE ERRO --- */}
      {modalConfig.show && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-in fade-in"
            onClick={() => setModalConfig(prev => ({ ...prev, show: false }))}
          />

          <div className="relative bg-white rounded-[2rem] p-8 shadow-2xl w-full max-w-md animate-fade-in border border-gray-100 flex flex-col items-center text-center">
            <div className="bg-red-50 p-4 rounded-full mb-6 border-4 border-red-100">
              <X className="text-red-500" size={30} strokeWidth={3} />
            </div>

            <h3 className="text-xl font-black text-[#1C415B] mb-2 uppercase tracking-wide">
              {modalConfig.title}
            </h3>
            <p className="text-sm text-gray-500 mb-8 leading-relaxed">
              {modalConfig.message}
            </p>

            <button
              onClick={() => setModalConfig(prev => ({ ...prev, show: false }))}
              className="w-full py-3 rounded-xl font-bold text-sm uppercase tracking-widest transition-all active:scale-95 bg-red-500 hover:bg-red-600 text-white"
            >
              Entendi
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoginPage;
