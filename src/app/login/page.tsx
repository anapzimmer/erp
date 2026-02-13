//app/login/page.tsx
"use client";

import { useState } from 'react';
import { Mail, Lock, Eye, EyeOff, LogIn, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { supabase } from "@/lib/supabaseClient";


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
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        showModal("Falha na Autenticação", error.message);
        return;
      }

      router.push("/");

    } catch (err) {
      showModal("Erro", "Erro ao conectar com o servidor.");
    } finally {
      setLoading(false);
    }
  };
  const [showSignup, setShowSignup] = useState(false);
  const [empresaNome, setEmpresaNome] = useState('');
  const [nomeResponsavel, setNomeResponsavel] = useState('');
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        showModal("Erro no Cadastro", error.message);
        return;
      }

      showModal(
        "Confirme seu e-mail",
        "Enviamos um link de confirmação para seu e-mail. Verifique sua caixa de entrada.",
        "success"
      );

      setShowSignup(false);
      setEmpresaNome('');
      setNomeResponsavel('');
      setPassword('');
    } catch (err) {
      showModal("Erro", "Erro ao criar conta.");
    } finally {
      setLoading(false);
    }
  };
  const handleForgotPassword = async () => {
    if (!email) {
      showModal("Informe seu e-mail", "Digite seu e-mail para redefinir sua senha.");
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: "http://localhost:3000/update-password",
      });

      if (error) {
        showModal("Erro", error.message);
        return;
      }

      showModal(
        "E-mail enviado",
        "Enviamos um link para redefinir sua senha. Verifique sua caixa de entrada.",
        "success"
      );
    } catch (err) {
      showModal("Erro", "Não foi possível enviar o e-mail.");
    } finally {
      setLoading(false);
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
            <div className="mt-4 text-center">
              <button
                onClick={() => setShowSignup(true)}
                className="text-sm text-[#1C415B] hover:text-[#39b89f] font-medium"
              >
                Criar Conta
              </button>
            </div>
            <div className="text-right">
  <button
    type="button"
    onClick={handleForgotPassword}
    className="text-xs text-[#1C415B] hover:text-[#39b89f] transition"
  >
    Esqueci minha senha
  </button>
</div>
          </form>
        </div>
      </div>

      {/* --- MODAL --- */}
      {modalConfig.show && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">

          {/* Overlay */}
          <div
            className="absolute inset-0 bg-black/30 backdrop-blur-sm"
            onClick={() => setModalConfig(prev => ({ ...prev, show: false }))}
          />

          {/* Card */}
          <div className="relative bg-white rounded-3xl p-8 shadow-2xl w-full max-w-sm animate-in fade-in zoom-in-95 border border-gray-100">

            {/* Ícone minimalista */}
            <div className="flex justify-center mb-5">
              <div className="w-12 h-12 flex items-center justify-center rounded-full bg-red-50">
                <X className="text-red-500" size={22} strokeWidth={2.5} />
              </div>
            </div>

            {/* Título */}
            <h3 className="text-lg font-bold text-[#1C415B] text-center">
              {modalConfig.title}
            </h3>

            {/* Mensagem */}
            <p className="text-sm text-gray-500 mt-3 text-center leading-relaxed">
              {modalConfig.message}
            </p>

            {/* Botão */}
            <button
              onClick={() => setModalConfig(prev => ({ ...prev, show: false }))}
              className="mt-6 w-full bg-[#1C415B] hover:bg-[#39b89f] text-white py-3 rounded-xl text-sm font-semibold transition-all active:scale-95"
            >
              Fechar
            </button>
          </div>
        </div>
      )}

      {showSignup && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/30 backdrop-blur-sm"
            onClick={() => setShowSignup(false)}
          />

          <div className="relative bg-white rounded-3xl p-8 shadow-2xl w-full max-w-sm border border-gray-100">

            <h3 className="text-xl font-bold text-[#1C415B] mb-6 text-center">
              Criar Conta
            </h3>

            <form onSubmit={handleSignup} className="space-y-4">

              <input
                type="text"
                placeholder="Nome da Empresa"
                value={empresaNome}
                onChange={(e) => setEmpresaNome(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#92D050] focus:border-[#92D050] focus:outline-none focus:ring-2 focus:ring-[#92D050] focus:border-[#92D050]transition-all"
                required
              />

              <input
                type="text"
                placeholder="Seu Nome"
                value={nomeResponsavel}
                onChange={(e) => setNomeResponsavel(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#92D050] focus:border-[#92D050] focus:outline-none focus:ring-2 focus:ring-[#92D050] focus:border-[#92D050]transition-all"
                required
              />

              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#92D050] focus:border-[#92D050] focus:outline-none focus:ring-2 focus:ring-[#92D050] focus:border-[#92D050]transition-all"
                required
              />

              <input
                type="password"
                placeholder="Senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#92D050] focus:border-[#92D050] focus:outline-none focus:ring-2 focus:ring-[#92D050] focus:border-[#92D050]transition-all"
                required
              />

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#1C415B] text-white py-3 rounded-xl font-bold text-sm uppercase tracking-widest"
              >
                {loading ? "Criando..." : "Criar Conta"}
              </button>

            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoginPage;
