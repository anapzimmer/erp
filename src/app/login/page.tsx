"use client";

import { useState,useEffect } from 'react';
import { Mail, Lock, Eye, EyeOff, LogIn, X, CheckCircle, Building2, FileText } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { supabase } from "@/lib/supabaseClient";


const LoginPage = () => {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupCompanyName, setSignupCompanyName] = useState(''); // Novo estado
  const [signupCnpj, setSignupCnpj] = useState(''); // Novo estado

  const [modalConfig, setModalConfig] = useState({
    show: false,
    title: "",
    message: "",
    type: "error" as "error" | "success"
  });

  const showModal = (title: string, message: string, type: "error" | "success" = "error") => {
    setModalConfig({ show: true, title, message, type });
  };

  const translateAuthError = (message: string) => {
    switch (message) {
      case "Invalid login credentials":
        return "Email ou senha inválidos.";
      case "Email not confirmed":
        return "Confirme seu e-mail antes de acessar.";
      default:
        return "Não foi possível autenticar. Tente novamente.";
    }
  };

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        showModal("Falha na Autenticação", translateAuthError(error.message));
        return;
      }

      router.push("/");
      router.refresh(); // Garante atualização da sessão

    } catch (err) {
      showModal("Erro", "Erro ao conectar com o servidor.");
    } finally {
      setLoading(false);
    }
  };
  const [showSignup, setShowSignup] = useState(false);

  supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_OUT') {
      // Limpa qualquer resquício que possa causar o erro de Refresh Token
      localStorage.clear();
      // Opcional: deletar cookies específicos se necessário
    }

    if (event === 'TOKEN_REFRESHED') {
      console.log('Token renovado com sucesso!');
    }
  });

  const handleSignup = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const passwordError = validateSignupPassword(signupPassword);
    if (passwordError) {
      showModal("Senha inválida", passwordError);
      setLoading(false);
      return;
    }

    try {
      // 1. Cadastrar no Supabase Auth passando os metadados da empresa
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: signupEmail,
        password: signupPassword,
        options: {
          data: {
            nome: signupEmail.split('@')[0],
            company_name: signupCompanyName, // <--- Mudar de 'nome_empresa' para 'company_name'
            cnpj: signupCnpj,
          },
        },
      });

      if (authError) throw authError;

      if (!authData.user) {
        throw new Error("Não foi possível criar o usuário.");
      }

      showModal(
        "Confirme seu e-mail",
        "Enviamos um link de confirmação para seu e-mail.",
        "success"
      );

      setShowSignup(false);
      // Limpar campos
      setSignupEmail('');
      setSignupPassword('');
      setSignupCompanyName('');
      setSignupCnpj('');

    } catch (err: any) {
      console.error("ERRO COMPLETO:", JSON.stringify(err, null, 2));
      showModal("Erro", err?.message || "Erro ao criar conta.");
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
        redirectTo: `${window.location.origin}/update-password`,
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

  const validateSignupPassword = (pass: string) => {
    if (pass.length < 6) {
      return "A senha deve ter no mínimo 6 caracteres.";
    }
    if (!/[a-z]/.test(pass)) {
      return "A senha deve conter pelo menos uma letra minúscula.";
    }
    if (!/[A-Z]/.test(pass)) {
      return "A senha deve conter pelo menos uma letra maiúscula.";
    }
    if (!/[0-9]/.test(pass)) {
      return "A senha deve conter pelo menos um número.";
    }
    if (!/[!@#$%^&*()_\+\-\=\[\]{};':"\\|<>?,./`~]/.test(pass)) {
      return "A senha deve conter pelo menos um caractere especial.";
    }
    return "";
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-[#FFFFFF] p-4 overflow-hidden font-inter">

      {/* --- CAMADA 1: VIDROS FLUTUANTES --- */}
      <div className="absolute inset-0 z-10 pointer-events-none opacity-60">
        {/* Vidro 1: Lento e grande */}
        <div
          className="glass-element w-64 h-96 rounded-3xl"
          style={{
            top: '10%', left: '5%',
            '--speed': '5s', '--lap-time': '10s'
          } as React.CSSProperties}
        />

        {/* Vidro 2: Rápido e médio */}
        <div
          className="glass-element w-80 h-48 rounded-[3rem]"
          style={{
            bottom: '15%', right: '10%',
            '--speed': '8s', '--lap-time': '5s'
          } as React.CSSProperties}
        />

        {/* Vidro 3: Pequeno e flutuante */}
        <div
          className="glass-element w-32 h-32 rounded-2xl"
          style={{
            top: '40%', right: '5%',
            '--speed': '8s', '--lap-time': '7s'
          } as React.CSSProperties}
        />
      </div>


      {/* --- CAMADA 2: AS 5 MÁQUINAS CNC --- */}
      <svg className="absolute inset-0 w-full h-full z-20 pointer-events-none" viewBox="0 0 1000 1000">
        {/* Laser 1: Horizontal Topo */}
        <path d="M-100,200 H1100" className="cnc-laser stroke-[#39B89F]" strokeWidth="1" fill="none" />
        <circle fill="#1C415B" className="spark" style={{ animation: 'sparkLight 0.5s infinite' }}>
          <animateMotion dur="8s" repeatCount="indefinite" path="M-100,200 H1100" />
        </circle>

        {/* Laser 2: Círculo Esquerda */}
        <path d="M200,500 A100,100 0 1,1 200,501" className="cnc-laser stroke-[#1C415B]" strokeWidth="1.5" fill="none" />
        <circle fill="#39B89F" className="spark" style={{ animation: 'sparkLight 0.3s infinite' }}>
          <animateMotion dur="10s" repeatCount="indefinite" path="M200,500 A100,100 0 1,1 200,501" />
        </circle>

        {/* Laser 3: Diagonal */}
        <path d="M800,-100 L1100,200" className="cnc-laser stroke-[#39B89F]" strokeWidth="1" fill="none" />
        <circle fill="#1C415B" className="spark" style={{ animation: 'sparkLight 0.2s infinite' }}>
          <animateMotion dur="6s" repeatCount="indefinite" path="M800,-100 L1100,200" />
        </circle>

        {/* Laser 4: Scanner Vertical */}
        <path d="M700,-100 V1100" className="cnc-laser stroke-[#1C415B]/20" strokeWidth="3" fill="none" />
        <circle fill="#39B89F" className="spark" style={{ animation: 'sparkLight 1s infinite' }}>
          <animateMotion dur="12s" repeatCount="indefinite" path="M700,-100 V1100" />
        </circle>

        {/* Laser 5: ZigZag Fundo */}
        <path d="M-100,800 L300,750 L600,850 L1100,800" className="cnc-laser stroke-[#39B89F]/40" strokeWidth="1" fill="none" />
        <circle fill="#1C415B" className="spark" style={{ animation: 'sparkLight 0.4s infinite' }}>
          <animateMotion dur="14s" repeatCount="indefinite" path="M-100,800 L300,750 L600,850 L1100,800" />
        </circle>
      </svg>

      {/* --- CAMADA 3: CARD DE LOGIN CENTRALIZADO --- */}
      <div className="relative z-50 w-full max-w-md animate-scale-up">
        <div className="mb-8 text-center">
          <img
            src="/glasscode.png"
            alt="Logo"
            className="h-20 w-auto mx-auto object-contain drop-shadow-md"
          />
        </div>

        <div className="bg-white/90 backdrop-blur-xl rounded-[2.5rem] p-8 md:p-10 shadow-[0_20px_50px_rgba(28,65,91,0.15)] border border-[#1C415B]/5">
          <div className="mb-10 text-center">
            <h2 className="text-3xl font-black text-[#1C415B] tracking-tight">Bem-vindo</h2>
            <p className="text-[#1C415B]/60 text-sm mt-2 font-medium">Acesse o painel de precisão.</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            {/* Email */}
            <div className="relative group">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-[#1C415B]/30 group-focus-within:text-[#39B89F] transition-colors" size={18} />
              <input
                type="email"
                placeholder="E-mail profissional"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-transparent rounded-2xl text-sm outline-none focus:bg-white focus:ring-2 focus:ring-[#39B89F]/20 focus:border-[#39B89F] transition-all"
                required
              />
            </div>

            {/* Senha */}
            <div className="relative group">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-[#1C415B]/30 group-focus-within:text-[#39B89F] transition-colors" size={18} />
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Sua senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-12 pr-12 py-4 bg-gray-50 border border-transparent rounded-2xl text-sm outline-none focus:bg-white focus:ring-2 focus:ring-[#39B89F]/20 focus:border-[#39B89F] transition-all"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-[#1C415B]/20 hover:text-[#39B89F]"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {/* Botão Entrar */}
            <button
              type="submit"
              disabled={loading}
              className={`w-full py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 shadow-lg 
    ${loading
                  ? 'bg-[#1C415B] text-white btn-processing cursor-wait'
                  : 'bg-[#1C415B] hover:bg-[#39B89F] text-white shadow-[#1C415B]/20 hover:shadow-[#39B89F]/20'
                }`}
            >
              {loading ? (
                <span className="relative z-10 flex items-center gap-2">
                  <div className="w-3 h-3 border-2 border-white/50 border-t-white rounded-full animate-spin" />
                  PROCESSANDO...
                </span>
              ) : (
                <>
                  <span className="relative z-10">ENTRAR</span>
                  <LogIn size={16} className="relative z-10" />
                </>
              )}
            </button>

            {/* Links de Rodapé */}
            <div className="flex flex-col gap-4 mt-8 text-center">
              <button
                type="button"
                onClick={() => setShowSignup(true)}
                className="text-sm font-bold text-[#1C415B] hover:text-[#39B89F] transition-colors"
              >
                Não tem conta? <span className="text-[#39B89F]">Criar Acesso</span>
              </button>
              <button
                type="button"
                onClick={handleForgotPassword}
                className="text-xs font-semibold text-gray-400 hover:text-[#1C415B] transition-colors"
              >
                Esqueci minha senha
              </button>
            </div>
          </form>
        </div>
      </div>

{modalConfig.show && (
  <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
    {/* Overlay com Blur mais suave */}
    <div
      className="absolute inset-0 bg-[#1C415B]/20 backdrop-blur-sm"
      onClick={() => setModalConfig(prev => ({ ...prev, show: false }))}
    />
    
    {/* Modal Card */}
    <div className="relative bg-white rounded-[2.5rem] p-8 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.1)] w-full max-w-sm border border-gray-100 flex flex-col items-center animate-scale-up">
      
      {/* SVG Centralizado com tamanho reduzido para maior elegância */}
      <div className="flex flex-col items-center">
  {/* O Ícone Moderno */}
  <svg 
    className="error-icon-svg mb-6" 
    width="72" 
    height="72" 
    viewBox="0 0 48 48"
  >
    {/* Fundo do erro */}
    <path fill="#f55376" d="M44,24c0,11-9,20-20,20S4,35,4,24S13,4,24,4S44,13,44,24z"/>
    
    {/* X estilizado */}
    <g className="rotate-slow" style={{ transformOrigin: 'center' }}>
      <path fill="#fac8d5" d="M12,17.6l5.7-5.7L36,30.4L30.4,36L12,17.6z"/>
      <path fill="#fac8d5" d="M30.4,12l5.7,5.7L17.6,36L12,30.4L30.4,12z"/>
      <rect width="8" height="8" x="20" y="20" fill="#fff" transform="rotate(-45.001 24 24)"/>
    </g>
  </svg>
  
  <div className="text-center">
    <h3 className="text-xl font-black text-[#1C415B] tracking-tight">{modalConfig.title}</h3>
    <p className="text-sm text-[#1C415B]/60 mt-2">{modalConfig.message}</p>
  </div>
</div>
     
      {/* Botão com estilo mais sutil */}
      <button
        onClick={() => setModalConfig(prev => ({ ...prev, show: false }))}
        className="mt-8 w-full bg-gray-50 hover:bg-gray-100 text-[#1C415B] py-3 rounded-2xl text-xs font-bold uppercase tracking-widest transition-all active:scale-95 border border-gray-200"
      >
        Entendido
      </button>
    </div>
  </div>
)}

      {/* --- MODAL SIGNUP --- */}
      {showSignup && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-[#1C415B]/30 backdrop-blur-sm"
            onClick={() => setShowSignup(false)}
          />
          <div className="relative bg-white rounded-3xl p-8 shadow-2xl w-full max-w-sm border border-gray-100">
            <h3 className="text-xl font-bold text-[#1C415B] mb-6 text-center">
              Criar Conta
            </h3>
            <form onSubmit={handleSignup} className="space-y-4">
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-[#39b89f]/50" size={18} />
                <input
                  type="text"
                  placeholder="Nome da Empresa"
                  value={signupCompanyName}
                  onChange={(e) => setSignupCompanyName(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-[#39b89f]/15 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#39b89f] focus:border-[#39b89f] transition-all"
                  required
                />
              </div>
              <div className="relative">
                <FileText className="absolute left-3 top-1/2 -translate-y-1/2 text-[#39b89f]/50" size={18} />
                <input
                  type="text"
                  placeholder="CNPJ ou CPF"
                  value={signupCnpj}
                  onChange={(e) => setSignupCnpj(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-[#39b89f]/15 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#39b89f] focus:border-[#39b89f] transition-all"
                  required
                />
              </div>
              <input
                type="email"
                placeholder="Email"
                value={signupEmail}
                onChange={(e) => setSignupEmail(e.target.value)}
                className="w-full px-4 py-3 border border-[#39b89f]/15 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#39b89f] focus:border-[#39b89f] transition-all"
                required
              />
              <input
                type="password"
                placeholder="Senha"
                value={signupPassword}
                onChange={(e) => setSignupPassword(e.target.value)}
                className="w-full px-4 py-3 border border-[#39b89f]/15 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#39b89f] focus:border-[#39b89f] transition-all"
                required
              />

              <div className="mt-3">
                <p className="text-xs font-semibold text-[#1C415B]/70 mb-2">
                  Sua senha deve conter:
                </p>
                <ul className="text-xs space-y-1">
                  <li className={`flex items-center gap-2 ${signupPassword.length >= 6 ? "text-[#39b89f]" : "text-[#1C415B]/40"}`}>
                    <span>•</span> <span>Mínimo 6 caracteres</span>
                  </li>
                  <li className={`flex items-center gap-2 ${/[a-z]/.test(signupPassword) ? "text-[#39b89f]" : "text-[#1C415B]/40"}`}>
                    <span>•</span> <span>Pelo menos 1 letra minúscula</span>
                  </li>
                  <li className={`flex items-center gap-2 ${/[A-Z]/.test(signupPassword) ? "text-[#39b89f]" : "text-[#1C415B]/40"}`}>
                    <span>•</span> <span>Pelo menos 1 letra maiúscula</span>
                  </li>
                  <li className={`flex items-center gap-2 ${/[0-9]/.test(signupPassword) ? "text-[#39b89f]" : "text-[#1C415B]/40"}`}>
                    <span>•</span> <span>Pelo menos 1 número</span>
                  </li>
                  <li className={`flex items-center gap-2 ${/[!@#$%^&*()_\+\-\=\[\]{};':"\\|<>?,./`~]/.test(signupPassword) ? "text-[#39b89f]" : "text-[#1C415B]/40"}`}>
                    <span>•</span> <span>Pelo menos 1 caractere especial</span>
                  </li>
                </ul>
              </div>

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