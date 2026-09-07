"use client";

import { useState, useEffect } from 'react';
import { Mail, Lock, Eye, EyeOff, ArrowRight, Check, Layers3 } from 'lucide-react';
import styles from './login.module.css';
import { useRouter } from 'next/navigation';
import { supabase } from "@/lib/supabaseClient";
import Image from "next/image";


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

   } catch (err: unknown) {
  const message = err instanceof Error ? err.message : "Erro ao conectar com o servidor.";
  showModal("Erro", message);
    } finally {
      setLoading(false);
    }
  };
  const [showSignup, setShowSignup] = useState(false);

  useEffect(() => {
   const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        localStorage.clear();
      }
      if (event === 'TOKEN_REFRESHED') {
        console.log('Token renovado com sucesso!');
      }
    });

    return () => {
      subscription.unsubscribe(); // Limpa a memória ao desmontar
    };
  }, []); // Array vazio garante que só rode uma vez

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

    } catch (err: unknown) {
  const message = err instanceof Error ? err.message : "Erro ao criar conta.";
  showModal("Erro", message);
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
      // Usa window com segurança para SSR
      const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
      
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${baseUrl}/update-password`,
      });

      if (error) throw error;

      showModal(
        "E-mail enviado",
        "Enviamos um link para redefinir sua senha. Verifique sua caixa de entrada.",
        "success"
      );
   } catch (err: unknown) {
  const message = err instanceof Error ? err.message
    : "Não foi possível enviar o e-mail.";

  showModal("Erro", message);
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
    if (!/[!@#$%^&*()_\+\-\=\[\]{};':"\\|<>x,./`~]/.test(pass)) {
      return "A senha deve conter pelo menos um caractere especial.";
    }
    return "";
  };

  return (
    <main className={styles.page}>
      <section className={styles.story} aria-label="GlassCode — gestão para vidraçarias">
        <div className={styles.brand}><Layers3 size={28} /><span>glass<span className={styles.brandLight}>code</span><small>GESTÃO PARA VIDRAÇARIAS</small></span></div>
        <div className={styles.storyContent}>
          <span className={styles.eyebrow}><span /> DA IDEIA À INSTALAÇÃO</span>
          <h1>Precisão em cada corte.<br /><em>Controle em cada projeto.</em></h1>
          <p>Sua vidraçaria conectada, do primeiro orçamento ao último detalhe.</p>
          <div className={styles.blueprint}>
            <div className={styles.drawingTitle}><span>ESTUDO DE PROJETO</span><span>01 / JANELA DE CORRER</span></div>
            <svg viewBox="0 0 560 320" role="img" aria-label="Desenho animado de uma janela de correr com duas folhas">
              <defs><linearGradient id="login-glass" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#75e4d1" stopOpacity=".2"/><stop offset="1" stopColor="#75e4d1" stopOpacity=".02"/></linearGradient></defs>
              <g stroke="#79c9be" strokeWidth="1" opacity=".65" fill="none"><path d="M90 58V30M470 58V30M90 40H470M78 40L96 40M90 34V46M470 34V46M482 70H510M482 266H510M500 70V266M494 70H506M494 266H506"/></g>
              <g fill="#a7d7d2" fontSize="11" fontFamily="monospace"><text x="250" y="30">1.200 mm</text><text x="516" y="195" transform="rotate(-90 516 195)">1.000 mm</text></g>
              <g className={styles.frame} fill="none" stroke="#8ae6d4" strokeWidth="2"><rect x="90" y="70" width="380" height="196"/><rect x="96" y="76" width="368" height="184"/><path d="M280 76V260M90 270H470"/></g>
              <g className={styles.slidingGlass}><rect x="102" y="82" width="172" height="172" fill="url(#login-glass)" stroke="#b0f1e5" strokeOpacity=".4"/><path d="M125 180L210 100M145 202L242 110" stroke="#ddfff8" strokeOpacity=".15"/><rect x="111" y="157" width="4" height="25" rx="2" fill="#a5e8da"/></g>
              <g className={styles.glass}><rect x="286" y="82" width="172" height="172" fill="url(#login-glass)" stroke="#b0f1e5" strokeOpacity=".4"/><path d="M305 180L390 100M325 202L422 110" stroke="#ddfff8" strokeOpacity=".15"/></g>
              <path d="M240 293H320M310 288L320 293L310 298" stroke="#68c9b5" fill="none"/>
            </svg>
            <div className={styles.drawingFooter}><span><span className={styles.dot}/> Cada detalhe faz a diferença.</span><span>GLASSCODE / PROJETOS</span></div>
          </div>
          <div className={styles.features}><span><Check size={15}/> Orçamentos</span><span><Check size={15}/> Cálculos precisos</span><span><Check size={15}/> Gestão de projetos</span></div>
        </div>
        <footer className={styles.storyFooter}><span>Projetado para quem transforma vidro em possibilidades.</span><span>GC®</span></footer>
      </section>
      <section className={styles.access}>
        <div className={styles.formCard}>
          <Image src="/glasscode.png" alt="GlassCode" width={160} height={80} priority unoptimized className={styles.logo}/>
          <div className={styles.heading}><span className={styles.kicker}>SEU ESPAÇO DE TRABALHO</span><h2>{showSignup ? 'Crie sua conta' : 'Bom ter você aqui.'}</h2><p>{showSignup ? 'Comece uma nova etapa na gestão da sua vidraçaria.' : 'Acesse sua conta e dê vida aos seus projetos.'}</p></div>
          {modalConfig.show && <div role={modalConfig.type === 'error' ? 'alert' : 'status'} className={`${styles.notice} ${modalConfig.type === 'success' ? styles.success : ''}`}><strong>{modalConfig.title}</strong><p>{modalConfig.message}</p><button type="button" aria-label="Fechar mensagem" onClick={() => setModalConfig(prev => ({...prev, show:false}))}>×</button></div>}
          <form onSubmit={showSignup ? handleSignup : handleLogin} className={styles.form}>
            <fieldset disabled={loading} className={styles.fields}>
              {showSignup && <><label htmlFor="company">Nome da empresa</label><input id="company" autoComplete="organization" required value={signupCompanyName} onChange={e => setSignupCompanyName(e.target.value)} placeholder="Sua vidraçaria"/><label htmlFor="document">CNPJ ou CPF</label><input id="document" required value={signupCnpj} onChange={e => setSignupCnpj(e.target.value)} placeholder="Documento da empresa ou responsável"/></>}
              <label htmlFor="email">E-mail</label><div className={styles.inputWrap}><Mail size={18}/><input id="email" type="email" autoComplete="username" required placeholder="voce@empresa.com.br" value={showSignup ? signupEmail : email} onChange={e => showSignup ? setSignupEmail(e.target.value) : setEmail(e.target.value)}/></div>
              <div className={styles.labelRow}><label htmlFor="password">Senha</label>{!showSignup && <button type="button" onClick={handleForgotPassword}>Esqueci minha senha</button>}</div>
              <div className={styles.inputWrap}><Lock size={18}/><input id="password" type={showPassword ? 'text' : 'password'} autoComplete={showSignup ? 'new-password' : 'current-password'} required placeholder={showSignup ? 'Crie uma senha' : 'Digite sua senha'} value={showSignup ? signupPassword : password} onChange={e => showSignup ? setSignupPassword(e.target.value) : setPassword(e.target.value)}/><button type="button" aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'} aria-pressed={showPassword} onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff size={18}/> : <Eye size={18}/>}</button></div>
              {showSignup && <p className={styles.passwordHint}>Use no mínimo 6 caracteres, com maiúscula, minúscula, número e símbolo.</p>}
              <button type="submit" className={styles.submit}>{loading ? <><span className={styles.spinner}/> Aguarde...</> : <>{showSignup ? 'Criar conta' : 'Entrar no sistema'}<ArrowRight size={19}/></>}</button>
            </fieldset>
          </form>
          <div className={styles.switch}>{showSignup ? 'Já tem uma conta?' : 'Ainda não tem uma conta?'} <button disabled={loading} type="button" onClick={() => {setShowSignup(!showSignup); setShowPassword(false); setModalConfig(prev => ({...prev, show:false}));}}>{showSignup ? 'Entrar' : 'Criar meu acesso'}<ArrowRight size={14}/></button></div>
          <div className={styles.secure}><Lock size={13}/><span>Seu próximo projeto começa aqui.</span></div>
        </div>
        <footer className={styles.accessFooter}>GlassCode <span>•</span> Gestão com clareza. Projetos com precisão.</footer>
      </section>
    </main>
  );
};

export default LoginPage;