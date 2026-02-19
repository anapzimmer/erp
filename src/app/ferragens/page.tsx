//app/ferragens/page.tsx
"use client"
import React, { useEffect, useState, useRef } from "react"
import { supabase } from "@/lib/supabaseClient"
import { formatarPreco } from "@/utils/formatarPreco"
import {
  LayoutDashboard, FileText, Image as ImageIcon, BarChart3, Wrench, Printer,
  Boxes, Briefcase, UsersRound, Layers, Palette, Package, Trash2, Edit2, 
  PlusCircle, X, Building2, ChevronDown, Download, Upload, Menu, Search, 
  DollarSign, ArrowUp
} from "lucide-react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import type { Ferragem } from "@/types/ferragem"

// --- TIPAGENS ---
type MenuItem = { nome: string; rota: string; icone: any; submenu?: { nome: string; rota: string }[] }

// --- CONSTANTES DE MENU ---
const menuPrincipal: MenuItem[] = [
  { nome: "Dashboard", rota: "/", icone: LayoutDashboard },
  {
    nome: "Orçamentos", rota: "/orcamentos", icone: FileText,
    submenu: [{ nome: "Espelhos", rota: "/espelhos" }, { nome: "Vidros", rota: "/calculovidro" }, { nome: "Vidros PDF", rota: "/calculovidroPDF" }]
  },
  { nome: "Imagens", rota: "/imagens", icone: ImageIcon },
  { nome: "Relatórios", rota: "/relatorios", icone: BarChart3 },
]

const menuCadastros: MenuItem[] = [
  { nome: "Clientes", rota: "/clientes", icone: UsersRound },
  { nome: "Vidros", rota: "/vidros", icone: Square },
  { nome: "Perfis", rota: "/perfis", icone: Package },
  { nome: "Ferragens", rota: "/ferragens", icone: Wrench },
  { nome: "Kits", rota: "/kits", icone: Boxes },
  { nome: "Serviços", rota: "/servicos", icone: Briefcase },
]

function Square({ size, className }: { size: number, className?: string }) {
  return <div style={{ width: size, height: size }} className={`border-2 border-current rounded-sm ${className}`} />
}

const padronizarTexto = (texto: string) => {
  if (!texto) return "";
  return texto.toLowerCase().trim().replace(/\s+/g, " ").replace(/(^\w)|(\s+\w)/g, (letra) => letra.toUpperCase());
};


export default function FerragensPage() {
  const router = useRouter()

  // --- ESTADOS UI/BRANDING ---
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const [empresaIdUsuario, setEmpresaIdUsuario] = useState<string | null>(null);
  const [usuarioEmail, setUsuarioEmail] = useState<string | null>(null);
  const [nomeEmpresa, setNomeEmpresa] = useState("Carregando...");
  const [showScrollTop, setShowScrollTop] = useState(false);


  const darkPrimary = "#1C415B";
  const darkSecondary = "#FFFFFF";
  const darkTertiary = "#39B89F";
  const darkHover = "#39B89F";
  const lightPrimary = "#F4F7FA";
  const lightSecondary = "#FFFFFF";
  const lightTertiary = "#1C415B";

  // --- ESTADOS LÓGICA ---
  const [ferragens, setFerragens] = useState<Ferragem[]>([])
const [novaFerragem, setNovaFerragem] = useState<Omit<Ferragem, "id">>({
  codigo: "",
  nome: "",
  cores: "",
  preco: null,
  categoria: "",
  empresa_id: "" // Adicione isto para satisfazer o TypeScript
});
  const [editando, setEditando] = useState<Ferragem | null>(null)
  const [carregando, setCarregando] = useState(false)
  const [mostrarModal, setMostrarModal] = useState(false)
  const [modalAviso, setModalAviso] = useState<{ titulo: string; mensagem: string; confirmar?: () => void } | null>(null)
  const [modalCarregando, setModalCarregando] = useState(false);
  const [filtroNome, setFiltroNome] = useState("")
  const [filtroCor, setFiltroCor] = useState("")
  const [isClient, setIsClient] = useState(false);
  useEffect(() => { setIsClient(true); }, []);

  // --- EFEITOS ---
  useEffect(() => {
    const init = async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) { router.push("/login"); return; }
      setUsuarioEmail(userData.user.email ?? null);

      const { data } = await supabase.from("perfis_usuarios").select("empresa_id").eq("id", userData.user.id).single();
      if (data) {
        setEmpresaIdUsuario(data.empresa_id);
        const { data: emp } = await supabase.from("empresas").select("nome").eq("id", data.empresa_id).single();
        if (emp) setNomeEmpresa(emp.nome);
        await carregarDados(data.empresa_id);
      }
      setCheckingAuth(false);
    };
    init();
  }, []);

  useEffect(() => {
    const handleScroll = () => setShowScrollTop(window.scrollY > 300);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  const carregarDados = async (empresaId: string) => {
    setCarregando(true);
    const { data } = await supabase.from("ferragens").select("*").eq("empresa_id", empresaId).order("codigo", { ascending: true });
    if (data) setFerragens(data);
    setCarregando(false);
  };

  // --- FUNÇÕES DE NEGÓCIO (CÓPIA DO MODELO) ---
  const salvarFerragem = async () => {
    if (!novaFerragem.codigo.trim() || !novaFerragem.nome.trim()) {
      setModalAviso({ titulo: "Atenção", mensagem: "Código e Nome são obrigatórios." });
      return;
    }
    if (!empresaIdUsuario) return;

    setCarregando(true);

    // Preparamos os dados padronizados
    const dadosParaSalvar = {
      codigo: novaFerragem.codigo.trim(),
      nome: padronizarTexto(novaFerragem.nome),
      cores: padronizarTexto(novaFerragem.cores),
      preco: novaFerragem.preco,
      categoria: padronizarTexto(novaFerragem.categoria) || "Ferragens",
      empresa_id: empresaIdUsuario
    };

    try {
      let error;

      if (editando) {
        // Se estamos editando um ID específico, usamos o update normal
        const { error: err } = await supabase
          .from("ferragens")
          .update(dadosParaSalvar)
          .eq("id", editando.id);
        error = err;
      } else {
        // Se é um novo cadastro, usamos o UPSERT com base na sua constraint de unicidade
        // Isso fará com que, se o código+nome+cor já existirem, ele apenas atualize o preço/categoria
        const { error: err } = await supabase
          .from("ferragens")
          .upsert([dadosParaSalvar], {
            onConflict: 'codigo,nome,cores'
          });
        error = err;
      }

      if (error) throw error;

      setMostrarModal(false);
      setEditando(null);
      await carregarDados(empresaIdUsuario);

    } catch (e: any) {
      setModalAviso({
        titulo: "Item Duplicado",
        mensagem: "Já existe uma ferragem com este código, nome e cor. Verifique os dados ou edite o item existente."
      });
      console.error("Erro ao salvar:", e.message);
    } finally {
      setCarregando(false);
    }
  };

  const deletarFerragem = (id: string) => {
    setModalAviso({
      titulo: "Confirmar Exclusão",
      mensagem: "Tem certeza que deseja excluir esta ferragem? Esta ação não pode ser desfeita.",
      confirmar: async () => {
        try {
          const { error } = await supabase
            .from("ferragens")
            .delete()
            .eq("id", id);

          if (error) throw error;

          // Atualiza o estado local para remover a linha da tabela instantaneamente
          setFerragens(prev => prev.filter(f => f.id !== id));
        } catch (e: any) {
          setModalAviso({ titulo: "Erro", mensagem: "Não foi possível excluir: " + e.message });
        }
      }
    });
  };

  const exportarCSV = () => {
    if (ferragens.length === 0) return;
    const csvContent = "data:text/csv;charset=utf-8,Codigo;Nome;Cores;Preco;Categoria\n" +
      ferragens.map(f => `${f.codigo};${f.nome};${f.cores};${f.preco || ""};${f.categoria}`).join("\n");
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", "ferragens.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  const importarCSV = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !empresaIdUsuario) return;

    setModalCarregando(true);
    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        // windows-1252 para ler acentos do Excel corretamente
        const text = new TextDecoder("windows-1252").decode(e.target?.result as ArrayBuffer);
        const rows = text.split(/\r?\n/);
        const dados = rows.slice(1).filter(row => row.trim() !== "");

        for (const row of dados) {
          // Divide rigorosamente pelo ponto e vírgula
          const columns = row.split(';').map(c => c.replace(/^["']|["']$/g, "").trim());

          // MAPEAMENTO REAL DO SEU ARQUIVO (Produto;Descrição;Categoria;Cor;Preço)
          const codigo = columns[0];      // Coluna 1: Produto
          let nomeOriginal = columns[1];  // Coluna 2: Descrição
          const categoriaArq = columns[2]; // Coluna 3: Categoria (Onde estava o erro!)
          let corOriginal = columns[3];   // Coluna 4: Cor
          const precoRaw = columns[4];    // Coluna 5: Preço

          if (codigo && nomeOriginal) {
            // LÓGICA DE COR: Se a coluna Cor estiver vazia, tenta extrair do nome (após o hífen)
            if (!corOriginal && nomeOriginal.includes("-")) {
              const partes = nomeOriginal.split("-");
              corOriginal = partes[partes.length - 1].trim();
              nomeOriginal = partes.slice(0, -1).join("-").trim();
            }

            // LÓGICA DE PREÇO INTELIGENTE:
            // Trata formatos como "5,25", "1.250,50" ou "5.25"
            let precoLimpo = null;
            if (precoRaw) {
              // Remove tudo que não é número, vírgula ou ponto
              const apenasNumeros = precoRaw.replace(/[^\d,.]/g, "");

              // Se tiver os dois (ponto e vírgula), remove o ponto (milhar) e troca a vírgula por ponto
              // Se tiver só vírgula, troca por ponto.
              const formatado = apenasNumeros.includes(',')
                ? apenasNumeros.replace(/\./g, "").replace(",", ".")
                : apenasNumeros;

              precoLimpo = parseFloat(formatado);
            }

            await supabase.from("ferragens").upsert([{
              codigo: codigo.toUpperCase(),
              nome: padronizarTexto(nomeOriginal),
              cores: corOriginal ? padronizarTexto(corOriginal) : "Padrão",
              preco: isNaN(precoLimpo as number) ? null : precoLimpo,
              categoria: padronizarTexto(categoriaArq) || "Ferragens",
              empresa_id: empresaIdUsuario
            }], {
              onConflict: 'codigo,nome,cores'
            });
          }
        }

        await carregarDados(empresaIdUsuario);
        setModalAviso({ titulo: "Sucesso", mensagem: "Importação concluída: Preços e Categorias organizados!" });
      } catch (err: any) {
        setModalAviso({ titulo: "Erro", mensagem: "Falha ao processar arquivo." });
      } finally {
        setModalCarregando(false);
        event.target.value = "";
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const eliminarDuplicados = () => {
    setModalAviso({
      titulo: "Eliminar Duplicados",
      mensagem: "Remover ferragens com mesmo CÓDIGO e COR?",
      confirmar: async () => {
        const jaVistos = new Set();
        const idsDeletar: string[] = [];
        const ordenadas = [...ferragens].sort((a, b) => a.id.localeCompare(b.id));
        ordenadas.forEach(f => {
          const chave = `${f.codigo.toLowerCase()}-${f.cores.toLowerCase()}`;
          if (jaVistos.has(chave)) idsDeletar.push(f.id);
          else jaVistos.add(chave);
        });
        if (idsDeletar.length > 0) {
          await supabase.from("ferragens").delete().in("id", idsDeletar);
          await carregarDados(empresaIdUsuario!);
        }
      }
    });
  }

  const renderMenuItem = (item: MenuItem) => {
    const Icon = item.icone;
    const temSubmenu = !!item.submenu;
    return (
      <div key={item.nome} className="mb-1">
        <div onClick={() => { if (!temSubmenu) { router.push(item.rota); setShowMobileMenu(false); } }}
          className="flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all hover:translate-x-1"
          style={{ color: darkSecondary }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = `${darkHover}33`}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
        >
          <div className="flex items-center gap-3">
            <Icon className="w-5 h-5" style={{ color: darkTertiary }} />
            <span className="font-medium text-sm">{item.nome}</span>
          </div>
        </div>
        {temSubmenu && (
          <div className="ml-8 mt-1 space-y-1">
            {item.submenu!.map((sub) => (
              <div key={sub.nome} onClick={() => { router.push(sub.rota); setShowMobileMenu(false); }}
                className="text-sm p-2 rounded-lg cursor-pointer hover:translate-x-1 transition-all"
                style={{ color: darkSecondary }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = `${darkHover}33`}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
              >{sub.nome}</div>
            ))}
          </div>
        )}
      </div>
    );
  };

  if (checkingAuth) return <div className="flex h-screen items-center justify-center bg-gray-50"><div className="w-8 h-8 border-4 animate-spin rounded-full" style={{ borderColor: darkPrimary, borderTopColor: 'transparent' }}></div></div>;


  const branding = {
    nome_empresa: nomeEmpresa,
    logo_url: "/glasscode2.png"
  }

  const gerarPDF = async () => {
  const { pdf } = await import('@react-pdf/renderer');
  const { FerragensPDF } = await import('../relatorios/ferragens/FerragensPDF');
  
  const blob = await pdf(
    <FerragensPDF dados={ferragens} empresa={nomeEmpresa} />
  ).toBlob();
  
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `ferragens-${nomeEmpresa}.pdf`;
  link.click();
};

  return (
    <div className="flex min-h-screen" style={{ backgroundColor: lightPrimary }}>
     {/* SIDEBAR */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 text-white flex flex-col p-4 shadow-2xl transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${showMobileMenu ? 'translate-x-0' : '-translate-x-full'}`} style={{ backgroundColor: darkPrimary }}>
        <button onClick={() => setShowMobileMenu(false)} className="md:hidden absolute top-4 right-4 text-white/50"> <X size={24} /> </button>
        <div className="px-3 py-4 mb-4 flex justify-center"> <Image src="/glasscode2.png" alt="Logo" width={200} height={56} className="h-12 md:h-14 object-contain" /> </div>
        <nav className="flex-1 overflow-y-auto space-y-6 pr-2">
          <div> <p className="px-3 text-xs font-bold uppercase tracking-wider mb-2" style={{ color: darkTertiary }}>Principal</p> {menuPrincipal.map(renderMenuItem)} </div>
          <div> <p className="px-3 text-xs font-bold uppercase tracking-wider mb-2" style={{ color: darkTertiary }}>Cadastros</p> {menuCadastros.map(renderMenuItem)} </div>
        </nav>
      </aside>

      <div className="flex-1 flex flex-col w-full">
        {/* TOPBAR */}
        <header className="border-b border-gray-100 py-3 px-4 md:py-4 md:px-8 flex items-center justify-between sticky top-0 z-30 shadow-sm bg-white no-print">
          <div className="flex items-center gap-2 md:gap-4">
            <button onClick={() => setShowMobileMenu(true)} className="md:hidden p-2 rounded-lg hover:bg-gray-100"> <Menu size={24} className="text-gray-600" /> </button>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setShowUserMenu(!showUserMenu)} className="flex items-center gap-2 pl-4 border-l border-gray-200">
              <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-600"><Building2 size={16} /></div>
              <span className="text-sm font-medium text-gray-700 hidden md:block">{nomeEmpresa}</span>
              <ChevronDown size={16} className={`text-gray-400 transition-transform ${showUserMenu ? "rotate-180" : ""}`} />
            </button>
          </div>
        </header>

        <main className="p-4 md:p-8 flex-1">

          {/* HEADER SEÇÃO */}
          <div className="flex items-center justify-between gap-4 mb-8">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl" style={{ backgroundColor: `${darkTertiary}15`, color: darkTertiary }}> <Wrench size={28} /> </div>
              <div>
                <h1 className="text-2xl md:text-4xl font-black" style={{ color: lightTertiary }}>Dashboard de Ferragens</h1>
                <p className="text-gray-500 mt-1 font-medium text-sm md:text-base">Gerencie seu catálogo de ferragens e preços.</p>
              </div>
            </div>
            <div className="flex gap-2">
              {/* BOTÃO IMPRIMIR (Print de Tela) */}
          <button
  onClick={() => gerarPDF()} // Vamos criar essa função agora
  className="p-2.5 rounded-xl bg-white border border-gray-100 hover:bg-gray-50 transition-all shadow-sm flex items-center justify-center"
  title="Imprimir Catálogo"
>
  <Printer size={20} style={{ color: darkPrimary }} />
</button>
              <button onClick={exportarCSV} className="p-2.5 rounded-xl bg-white border border-gray-100 hover:bg-gray-50">
                <Download className="w-5 h-5 text-gray-600" />
              </button>

              {/* O label funciona como o botão visual */}
              <label htmlFor="importarCSV" className="p-2.5 rounded-xl bg-white border border-gray-100 cursor-pointer hover:bg-gray-50">
                <Upload className="w-5 h-5 text-gray-600" />
              </label>

              {/* O input fica escondido e dispara o evento onChange */}
              <input
                type="file"
                id="importarCSV"
                accept=".csv"
                className="hidden"
                onChange={importarCSV}
              />
            </div>
          </div>

          {/* INDICADORES */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 cards-indicadores">
            {[
              { titulo: "Total", valor: ferragens.length, icone: Layers },
              { titulo: "Com Preço", valor: ferragens.filter(f => f.preco).length, icone: DollarSign },
              { titulo: "Cores", valor: new Set(ferragens.map(f => f.cores)).size, icone: Palette },
              { titulo: "Categorias", valor: new Set(ferragens.map(f => f.categoria)).size, icone: Package }
            ].map(card => (
              <div key={card.titulo} className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col items-center justify-center">
                <card.icone className="w-7 h-7 mb-2" style={{ color: darkTertiary }} />
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{card.titulo}</h3>
                <p className="text-2xl font-bold" style={{ color: darkPrimary }}>{card.valor}</p>
              </div>
            ))}
          </div>

          {/* FILTROS E AÇÃO */}
          <div className="flex justify-between items-center mb-6 gap-4 flex-wrap filtros-sessao">
            <div className="flex flex-wrap gap-3 flex-1">
              {/* BUSCA GLOBAL: Nome, Código ou Categoria */}
              <div className="relative w-full md:w-96">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  placeholder="Pesquisar por nome, código ou categoria..."
                  value={filtroNome}
                  onChange={e => setFiltroNome(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm bg-white outline-none focus:ring-2 transition-all"
                  style={{ "--tw-ring-color": darkTertiary } as React.CSSProperties}
                />
              </div>

              {/* FILTRO DE COR SEPARADO */}
              <input
                type="text"
                placeholder="Filtrar por cor..."
                value={filtroCor}
                onChange={e => setFiltroCor(e.target.value)}
                className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm bg-white outline-none focus:ring-2 transition-all w-full md:w-48"
                style={{ "--tw-ring-color": darkTertiary } as React.CSSProperties}
              />
            </div>

            <div className="flex items-center gap-2 no-print">
              <button onClick={eliminarDuplicados} className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm text-gray-500 hover:text-red-600 hover:bg-red-50 transition">
                <Trash2 size={18} /> Limpar Duplicados
              </button>
              <button onClick={() => {
                setEditando(null); setNovaFerragem({
                  codigo: "", nome: "", cores: "", preco: null, categoria: "",
                  empresa_id: empresaIdUsuario || ""
                }); setMostrarModal(true);
              }} className="flex items-center gap-2 px-6 py-2.5 rounded-2xl font-black text-xs uppercase tracking-wider shadow-sm" style={{ backgroundColor: darkTertiary, color: darkPrimary }}>
                <PlusCircle size={18} /> Nova Ferragem
              </button>
            </div>
          </div>

          {/* TABELA ATUALIZADA */}
          <div className="overflow-x-auto bg-white rounded-3xl shadow-sm border border-gray-100">
            <table className="w-full text-sm text-left border-collapse">
              <thead style={{ backgroundColor: darkPrimary, color: darkSecondary }}>
                <tr>
                  <th className="p-4 text-xs uppercase tracking-widest">Código</th>
                  <th className="p-4 text-xs uppercase tracking-widest">Nome</th>
                  <th className="p-4 text-xs uppercase tracking-widest ">Cor</th>
                  <th className="p-4 text-xs uppercase tracking-widest ">Categoria</th>
                  <th className="p-4 text-xs uppercase tracking-widest ">Preço</th>
                  <th className="p-4 text-xs uppercase tracking-widest text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {ferragens
                  .filter(f => {
                    const termo = filtroNome.toLowerCase();
                    // Busca no Nome, no Código ou na Categoria
                    const matchesBusca =
                      f.nome.toLowerCase().includes(termo) ||
                      f.codigo.toLowerCase().includes(termo) ||
                      f.categoria.toLowerCase().includes(termo);

                    // Filtro de Cor (separado)
                    const matchesCor = f.cores.toLowerCase().includes(filtroCor.toLowerCase());

                    return matchesBusca && matchesCor;
                  })
                  .map(f => (
                    <tr key={f.id} className="hover:bg-gray-50 transition-colors">
                      <td className="p-4 text-gray-500 font-medium">{f.codigo}</td>
                      <td className="p-4">
                        <span className="p-4 text-gray-500 font-medium" style={{ color: lightTertiary }}>{f.nome}</span>
                      </td>
                      <td className="p-4">
                        {/* Padronização visual da cor com a cor do sistema (darkTertiary) */}
                        <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase border"
                          style={{ color: darkTertiary, borderColor: `${darkTertiary}44`, backgroundColor: `${darkTertiary}11` }}>
                          {f.cores || "Padrão"}
                        </span>
                      </td>
                      <td className="p-4 text-gray-500 font-medium">{f.categoria || "Geral"}</td>
                      <td className="p-4 text-gray-500 font-medium" style={{ color: darkPrimary }}>
                        {f.preco ? formatarPreco(f.preco) : "-"}
                      </td>
                      <td className="p-4">
                        <div className="flex justify-center gap-2">
                          <button onClick={() => { setEditando(f); setNovaFerragem(f); setMostrarModal(true); }} className="p-2.5 rounded-xl hover:bg-gray-100" style={{ color: darkPrimary }}><Edit2 size={18} /></button>
                          <button onClick={() => deletarFerragem(f.id)} className="p-2.5 rounded-xl text-red-500 hover:bg-red-50"><Trash2 size={18} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </main>
      </div>

      {/* MODAL DE CADASTRO/EDIÇÃO */}
      {mostrarModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-40 animate-fade-in px-4">
          <div className="bg-white rounded-3xl p-8 shadow-2xl w-full max-w-lg border border-gray-100 overflow-hidden">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-extrabold" style={{ color: darkPrimary }}>
                {editando ? "Editar Ferragem" : "Cadastrar Ferragem"}
              </h2>
              <button onClick={() => setMostrarModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 cards-indicadores">
              <div className="col-span-2">
                <label className="text-sm font-semibold text-gray-600 mb-1 block">Código *</label>
                <input
                  type="text"
                  placeholder="Ex: F001"
                  value={novaFerragem.codigo}
                  onChange={e => setNovaFerragem({ ...novaFerragem, codigo: e.target.value.toUpperCase() })}
                  className="w-full p-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2"
                  style={{ "--tw-ring-color": darkTertiary } as React.CSSProperties}
                />
              </div>
              <div className="col-span-2">
                <label className="text-sm font-semibold text-gray-600 mb-1 block">Nome *</label>
                <input
                  type="text"
                  placeholder="Ex: Dobradiça 1101"
                  value={novaFerragem.nome}
                  onChange={e => setNovaFerragem({ ...novaFerragem, nome: e.target.value })}
                  className="w-full p-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2"
                  style={{ "--tw-ring-color": darkTertiary } as React.CSSProperties}
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-600 mb-1 block">Cores</label>
                <input
                  type="text"
                  placeholder="Ex: Branco, Preto"
                  value={novaFerragem.cores}
                  onChange={e => setNovaFerragem({ ...novaFerragem, cores: e.target.value })}
                  className="w-full p-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2"
                  style={{ "--tw-ring-color": darkTertiary } as React.CSSProperties}
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-600 mb-1 block">Categoria</label>
                <input
                  type="text"
                  placeholder="Ex: Box, Porta"
                  value={novaFerragem.categoria}
                  onChange={e => setNovaFerragem({ ...novaFerragem, categoria: e.target.value })}
                  className="w-full p-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2"
                  style={{ "--tw-ring-color": darkTertiary } as React.CSSProperties}
                />
              </div>
              <div className="col-span-2">
                <label className="text-sm font-semibold text-gray-600 mb-1 block">Preço Base (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0,00"
                  value={novaFerragem.preco ?? ""}
                  onChange={e => setNovaFerragem({ ...novaFerragem, preco: e.target.value ? Number(e.target.value) : null })}
                  className="w-full p-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2"
                  style={{ "--tw-ring-color": darkTertiary } as React.CSSProperties}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
              <button
                onClick={() => setMostrarModal(false)}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-100 transition"
              >
                Cancelar
              </button>
              <button
                onClick={salvarFerragem}
                disabled={carregando}
                className="px-5 py-2.5 rounded-xl text-sm font-bold hover:opacity-90 transition flex items-center gap-2"
                style={{ backgroundColor: darkTertiary, color: darkPrimary }}
              >
                {carregando ? "Salvando..." : (editando ? "Atualizar" : "Salvar")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AVISOS E LOADING */}
      {modalCarregando && <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50"><div className="bg-white p-8 rounded-3xl animate-bounce">Processando CSV...</div></div>}
      {modalAviso && <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50 px-4"><div className="bg-white p-6 rounded-3xl max-w-sm w-full text-center">
        <h3 className="font-bold text-lg mb-2" style={{ color: darkPrimary }}>{modalAviso.titulo}</h3>
        <p className="text-gray-600 text-sm mb-6">{modalAviso.mensagem}</p>
        <div className="flex justify-center gap-3">
          <button onClick={() => setModalAviso(null)} className="px-4 py-2 bg-gray-100 rounded-xl font-semibold">Fechar</button>
          {modalAviso.confirmar && <button onClick={() => { modalAviso.confirmar?.(); setModalAviso(null); }} className="px-4 py-2 bg-red-600 text-white rounded-xl font-semibold">Confirmar</button>}
        </div>
      </div></div>}
      {showScrollTop && <button onClick={scrollToTop} className="fixed bottom-6 right-6 p-3 rounded-full shadow-lg z-50" style={{ backgroundColor: darkTertiary, color: darkPrimary }}><ArrowUp size={24} /></button>}
    </div>
  )
}