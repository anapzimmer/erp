"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Image as ImageIcon, Moon, Save, Sun } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { useTheme } from "@/context/ThemeContext";
import Image from "next/image";
import Sidebar from "@/components/Sidebar";
import Toast from "@/components/Toast"
import Header from "@/components/Header";
import ThemeSelect from "@/components/ThemeSelect";

export default function ConfiguracoesBrandingPage() {
  const router = useRouter();
  const { refreshTheme } = useTheme();
  const [errorMessage, setErrorMessage] = useState("");
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [usuarioEmail, setUsuarioEmail] = useState("");
  const [nomeEmpresa, setNomeEmpresa] = useState("Carregando...");
  const [empresaId, setEmpresaId] = useState<string | null>(null);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [sidebarExpandido, setSidebarExpandido] = useState(true);

  // Estados de Imagem
  const [logoLight, setLogoLight] = useState<string | null>(null);
  const [logoDark, setLogoDark] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [showToast, setShowToast] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: userData } = await supabase.auth.getUser();
        if (!userData.user) {
          router.push("/login");
          return;
        }
        setUsuarioEmail(userData.user.email || "Usuário");

        const { data: perfil, error: perfilError } = await supabase
          .from("perfis_usuarios")
          .select("empresa_id")
          .eq("id", userData.user.id)
          .maybeSingle();

        if (perfilError || !perfil) {
          console.error("Erro ao buscar perfil:", perfilError);
          return;
        }

        setEmpresaId(perfil.empresa_id);

        // Buscar branding atual
        const { data: brandingData } = await supabase
          .from("configuracoes_branding")
          .select("logo_light, logo_dark")
          .eq("empresa_id", perfil.empresa_id)
          .single();

        // Buscar Nome da Empresa
        const { data: empresaData } = await supabase
          .from("empresas")
          .select("nome")
          .eq("id", perfil.empresa_id)
          .single();

        if (empresaData) {
          setNomeEmpresa(empresaData.nome);
        }

        if (brandingData) {
          setLogoLight(brandingData.logo_light || null);
          setLogoDark(brandingData.logo_dark || null);


        }
      } catch (error) {
        console.error("Erro ao carregar configuracoes de branding:", error);
      } finally {
        setCheckingAuth(false);
      }
    };
    fetchData();
  }, [router]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, setLogo: React.Dispatch<React.SetStateAction<string | null>>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setErrorMessage("Escolha uma imagem de até 5 MB."); return; }
    setErrorMessage("");
    const objectUrl = URL.createObjectURL(file);
    const image = new window.Image();
    image.onload = () => {
      try {
        const scale = Math.min(1, 1600 / Math.max(image.naturalWidth, image.naturalHeight));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
        canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Canvas indisponível");
        ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
        setLogo(canvas.toDataURL("image/png"));
      } catch { setErrorMessage("Não foi possível preparar esta imagem. Tente PNG ou JPEG."); }
      finally { URL.revokeObjectURL(objectUrl); }
    };
    image.onerror = () => { URL.revokeObjectURL(objectUrl); setErrorMessage("Imagem inválida. Escolha PNG, JPEG, WebP ou SVG."); };
    image.src = objectUrl;
  };

const handleSave = async () => {
  if (!empresaId) return

  setErrorMessage("")
  setLoading(true)

  try {

    const { error } = await supabase
      .from("configuracoes_branding")
      .upsert({
        empresa_id: empresaId,
        logo_light: logoLight,
        logo_dark: logoDark,
        updated_at: new Date().toISOString()
      }, { onConflict: "empresa_id" })

    if (error) throw error

    setShowToast(true)

    setTimeout(async () => {
      await refreshTheme()
    }, 1000)

  } catch (err) {

    console.error(err)
    setErrorMessage("Não foi possível salvar as logos. Tente novamente.")

  } finally {

    setLoading(false)

  }
}

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  if (checkingAuth) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-surface-secondary">
        <div className="w-8 h-8 border-4 border-border-strong border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen" style={{ backgroundColor: "var(--background)" }}>

      {/* SIDEBAR DE PREVIEW - Agora seguindo o padrão do Contexto */}
      {/* Overlay para Mobile */}
      {showMobileMenu && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-60 md:hidden transition-opacity"
          onClick={() => setShowMobileMenu(false)}
        />
      )}
      <Sidebar
        showMobileMenu={showMobileMenu}
        setShowMobileMenu={setShowMobileMenu}
        nomeEmpresa={nomeEmpresa}
        expandido={sidebarExpandido}
        setExpandido={setSidebarExpandido}
      />

      {/* Conteúdo Principal */}
      <div className="flex-1 flex flex-col w-full">
        <Header
          setShowMobileMenu={setShowMobileMenu}
          nomeEmpresa={nomeEmpresa}
          usuarioEmail={usuarioEmail}
          handleSignOut={handleSignOut}

        />

        <main className="mx-auto w-full max-w-5xl p-4 md:p-8 space-y-6">
          <section className="gc-panel flex flex-wrap items-center justify-between gap-5">
            <div><h1 className="text-2xl font-semibold">Aparência e logos</h1><p className="gc-muted mt-2 text-sm">A identidade Glass Code é padrão para todas as empresas. Personalize as logos da sua empresa.</p></div>
            <ThemeSelect />
          </section>
          <section className="gc-panel space-y-5">
            <h2 className="flex items-center gap-2 text-lg"><ImageIcon size={20} /> Logos da empresa</h2>
            <p className="gc-muted text-sm">A logo é escolhida automaticamente conforme o fundo. Com apenas uma versão cadastrada, ela será usada nos dois temas. Os documentos usam a versão para fundo claro.</p>
            <div className="grid gap-5 md:grid-cols-2">
              {[{ label: "Logo clara", hint: "Para fundos claros", logo: logoLight, setter: setLogoLight, dark: false }, { label: "Logo escura", hint: "Para fundos escuros", logo: logoDark, setter: setLogoDark, dark: true }].map(item => (
                <div key={item.label} className="space-y-3 rounded-xl border border-border p-4">
                  <label className="flex items-center gap-2 font-medium" htmlFor={item.dark ? "logo-escura" : "logo-clara"}>{item.dark ? <Moon size={17} /> : <Sun size={17} />}{item.label}</label>
                  <p className="gc-muted text-sm">{item.hint}</p>
                  <div className="flex h-36 items-center justify-center rounded-lg border border-border p-5" style={{ background: item.dark ? "var(--gc-graphite)" : "#FFFFFF" }}>
                    <Image unoptimized src={item.logo || (item.dark ? logoLight : logoDark) || (item.dark ? "/glasscode-dark.png" : "/glasscode-light.png")} alt={item.label} width={240} height={100} className="max-h-24 object-contain" />
                  </div>
                  <input id={item.dark ? "logo-escura" : "logo-clara"} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={e => handleFileChange(e, item.setter)} className="w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-surface-secondary file:p-2" />
                  {item.logo && <button className="text-sm text-danger" onClick={() => item.setter(null)}>Remover esta versão</button>}
                </div>
              ))}
            </div>
            {errorMessage && <p role="alert" className="text-danger">{errorMessage}</p>}
            <button className="gc-action" onClick={handleSave} disabled={loading || !empresaId}><Save size={17} />{loading ? "Salvando…" : "Salvar logos"}</button>
          </section>
        </main>
      </div>

      <Toast
        show={showToast}
        message="Logos atualizadas com sucesso"
        onClose={() => setShowToast(false)}
      />
    </div>
  );
}
