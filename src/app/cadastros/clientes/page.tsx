"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  ChevronDown,
  Edit2,
  FileSearch,
  Loader2,
  MapPin,
  Phone,
  Plus,
  Search,
  Trash2,
  UserRound,
  UsersRound,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/context/ThemeContext";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import CadastrosAvisoModal from "@/components/CadastrosAvisoModal";

type TipoPessoa = "juridica" | "fisica";

type Cliente = {
  id: string;
  empresa_id?: string;
  tipo_pessoa: TipoPessoa;
  cpf_cnpj?: string | null;
  nome: string;
  razao_social?: string | null;
  nome_fantasia?: string | null;
  situacao_cadastral?: string | null;
  telefone?: string | null;
  email?: string | null;
  cep?: string | null;
  logradouro?: string | null;
  numero?: string | null;
  complemento?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  estado?: string | null;
  cnae_principal?: string | null;
  porte?: string | null;
  data_abertura?: string | null;
  rota: string;
  grupo_preco_id?: string | null;
  observacoes?: string | null;
  consultado_receita_em?: string | null;
};

type GrupoPreco = { id: string; nome: string };

type DadosCnpj = {
  cnpj: string;
  razaoSocial: string;
  nomeFantasia: string;
  situacaoCadastral: string;
  telefone: string;
  email: string;
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  estado: string;
  cnaePrincipal: string;
  porte: string;
  dataAbertura: string;
  dadosOriginais?: unknown;
};

type FormCliente = Omit<Cliente, "id" | "empresa_id">;

const formInicial: FormCliente = {
  tipo_pessoa: "juridica",
  cpf_cnpj: "",
  nome: "",
  razao_social: "",
  nome_fantasia: "",
  situacao_cadastral: "",
  telefone: "",
  email: "",
  cep: "",
  logradouro: "",
  numero: "",
  complemento: "",
  bairro: "",
  cidade: "",
  estado: "",
  cnae_principal: "",
  porte: "",
  data_abertura: "",
  rota: "",
  grupo_preco_id: null,
  observacoes: "",
  consultado_receita_em: null,
};

const somenteNumeros = (valor = "") => valor.replace(/\D/g, "");

const formatarCnpj = (valor = "") => {
  const numeros = somenteNumeros(valor).slice(0, 14);
  return numeros
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
};

const formatarCpf = (valor = "") => {
  const numeros = somenteNumeros(valor).slice(0, 11);
  return numeros
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/(\d{3})(\d)/, "$1-$2");
};

const formatarDocumento = (valor: string, tipo: TipoPessoa) =>
  tipo === "juridica" ? formatarCnpj(valor) : formatarCpf(valor);

const formatarTelefone = (valor = "") => {
  const numeros = somenteNumeros(valor).slice(0, 11);
  if (numeros.length <= 10) {
    return numeros.replace(/^(\d{0,2})(\d{0,4})(\d{0,4}).*/, (_, ddd, parte1, parte2) => {
      let resultado = "";
      if (ddd) resultado += `(${ddd}`;
      if (ddd.length === 2) resultado += ") ";
      if (parte1) resultado += parte1;
      if (parte2) resultado += `-${parte2}`;
      return resultado;
    });
  }
  return numeros.replace(/^(\d{2})(\d{5})(\d{4})$/, "($1) $2-$3");
};

const formatarCep = (valor = "") =>
  somenteNumeros(valor).slice(0, 8).replace(/^(\d{5})(\d)/, "$1-$2");

const padronizarNome = (texto = "") =>
  texto
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ")
    .replace(/(^\w)|([\sÀ-ÿ]\w)/g, (letra) => letra.toUpperCase());

const formatarRota = (valor = "") => {
  const limpo = valor.trim();
  if (/^\d+$/.test(limpo)) return `${limpo}MM`;
  return padronizarNome(limpo);
};

const statusAtivo = (status?: string | null) =>
  (status || "").toUpperCase().includes("ATIVA");

export default function ClientesPage() {
  const router = useRouter();
  const { user, empresaId, nomeEmpresa, loading: checkingAuth } = useAuth();
  const { theme } = useTheme();

  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [sidebarExpandido, setSidebarExpandido] = useState(true);
  const [showScrollTop, setShowScrollTop] = useState(false);

  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [grupos, setGrupos] = useState<GrupoPreco[]>([]);
  const [form, setForm] = useState<FormCliente>(formInicial);
  const [editando, setEditando] = useState<Cliente | null>(null);
  const [mostrarModal, setMostrarModal] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [consultandoCnpj, setConsultandoCnpj] = useState(false);
  const [cnpjConsultado, setCnpjConsultado] = useState(false);
  const [erroCnpj, setErroCnpj] = useState("");

  const [busca, setBusca] = useState("");
  const [filtroTipo, setFiltroTipo] = useState<"" | TipoPessoa>("");
  const [filtroRota, setFiltroRota] = useState("");
  const [filtroCidade, setFiltroCidade] = useState("");

  const [modalAviso, setModalAviso] = useState<{
    titulo: string;
    mensagem: string;
    confirmar?: () => void;
  } | null>(null);

  const ultimaConsultaRef = useRef("");

  const carregarDados = useCallback(async () => {
    if (!user || !empresaId) return;
    setCarregando(true);

    const [clientesRes, gruposRes] = await Promise.all([
      supabase
        .from("clientes")
        .select("*")
        .eq("empresa_id", empresaId)
        .order("nome", { ascending: true }),
      supabase
        .from("tabelas")
        .select("id, nome")
        .eq("empresa_id", empresaId)
        .order("nome", { ascending: true }),
    ]);

    if (clientesRes.error) {
      setModalAviso({ titulo: "Erro", mensagem: clientesRes.error.message });
    } else {
      setClientes((clientesRes.data as Cliente[]) || []);
    }

    if (gruposRes.error) {
      console.error("Erro ao carregar tabelas:", gruposRes.error.message);
    } else {
      setGrupos((gruposRes.data as GrupoPreco[]) || []);
    }

    setCarregando(false);
  }, [empresaId, user]);

  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  useEffect(() => {
    const onScroll = () => setShowScrollTop(window.scrollY > 300);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const consultarCnpj = useCallback(async (cnpjInformado?: string) => {
    const cnpj = somenteNumeros(cnpjInformado ?? form.cpf_cnpj ?? "");
    if (form.tipo_pessoa !== "juridica" || cnpj.length !== 14) return;
    if (ultimaConsultaRef.current === cnpj && cnpjConsultado) return;

    setConsultandoCnpj(true);
    setErroCnpj("");
    setCnpjConsultado(false);

    try {
      const resposta = await fetch(`/api/cnpj/${cnpj}`, {
        method: "GET",
        headers: { Accept: "application/json" },
        cache: "no-store",
      });

      const retorno = await resposta.json();
      if (!resposta.ok) throw new Error(retorno?.message || "Não foi possível consultar o CNPJ.");

      const dados = retorno.data as DadosCnpj;
      ultimaConsultaRef.current = cnpj;

      setForm((anterior) => ({
        ...anterior,
        cpf_cnpj: formatarCnpj(dados.cnpj || cnpj),
        nome: dados.nomeFantasia || dados.razaoSocial || anterior.nome,
        razao_social: dados.razaoSocial || "",
        nome_fantasia: dados.nomeFantasia || "",
        situacao_cadastral: dados.situacaoCadastral || "",
        telefone: formatarTelefone(dados.telefone || anterior.telefone || ""),
        email: dados.email || anterior.email || "",
        cep: formatarCep(dados.cep || ""),
        logradouro: dados.logradouro || "",
        numero: dados.numero || "",
        complemento: dados.complemento || "",
        bairro: dados.bairro || "",
        cidade: dados.cidade || "",
        estado: dados.estado || "",
        cnae_principal: dados.cnaePrincipal || "",
        porte: dados.porte || "",
        data_abertura: dados.dataAbertura || "",
        consultado_receita_em: new Date().toISOString(),
      }));

      setCnpjConsultado(true);
    } catch (error) {
      setErroCnpj(error instanceof Error ? error.message : "Erro ao consultar CNPJ.");
    } finally {
      setConsultandoCnpj(false);
    }
  }, [cnpjConsultado, form.cpf_cnpj, form.tipo_pessoa]);

  useEffect(() => {
    if (!mostrarModal || editando || form.tipo_pessoa !== "juridica") return;
    const cnpj = somenteNumeros(form.cpf_cnpj || "");
    if (cnpj.length !== 14) {
      setCnpjConsultado(false);
      setErroCnpj("");
      return;
    }

    const timer = window.setTimeout(() => consultarCnpj(cnpj), 650);
    return () => window.clearTimeout(timer);
  }, [consultarCnpj, editando, form.cpf_cnpj, form.tipo_pessoa, mostrarModal]);

  const abrirNovo = () => {
    setEditando(null);
    setForm(formInicial);
    setCnpjConsultado(false);
    setErroCnpj("");
    ultimaConsultaRef.current = "";
    setMostrarModal(true);
  };

  const abrirEdicao = (cliente: Cliente) => {
    setEditando(cliente);
    setForm({
      ...formInicial,
      ...cliente,
      tipo_pessoa: cliente.tipo_pessoa || "juridica",
      cpf_cnpj: formatarDocumento(cliente.cpf_cnpj || "", cliente.tipo_pessoa || "juridica"),
    });
    setCnpjConsultado(Boolean(cliente.consultado_receita_em));
    setErroCnpj("");
    ultimaConsultaRef.current = somenteNumeros(cliente.cpf_cnpj || "");
    setMostrarModal(true);
  };

  const fecharModal = () => {
    if (carregando || consultandoCnpj) return;
    setMostrarModal(false);
  };

  const salvarCliente = async () => {
    if (!empresaId) return;
    if (!form.nome.trim() || !form.rota.trim()) {
      setModalAviso({ titulo: "Atenção", mensagem: "Nome do cliente e rota são obrigatórios." });
      return;
    }

    const documento = somenteNumeros(form.cpf_cnpj || "");
    if (documento && form.tipo_pessoa === "juridica" && documento.length !== 14) {
      setModalAviso({ titulo: "Atenção", mensagem: "Informe um CNPJ com 14 números." });
      return;
    }
    if (documento && form.tipo_pessoa === "fisica" && documento.length !== 11) {
      setModalAviso({ titulo: "Atenção", mensagem: "Informe um CPF com 11 números." });
      return;
    }

    setCarregando(true);

    const payload = {
      tipo_pessoa: form.tipo_pessoa,
      cpf_cnpj: documento || null,
      nome: padronizarNome(form.nome),
      razao_social: form.razao_social?.trim() || null,
      nome_fantasia: form.nome_fantasia?.trim() || null,
      situacao_cadastral: form.situacao_cadastral?.trim() || null,
      telefone: form.telefone?.trim() || null,
      email: form.email?.trim().toLowerCase() || null,
      cep: somenteNumeros(form.cep || "") || null,
      logradouro: form.logradouro?.trim() || null,
      numero: form.numero?.trim() || null,
      complemento: form.complemento?.trim() || null,
      bairro: form.bairro?.trim() || null,
      cidade: form.cidade ? padronizarNome(form.cidade) : null,
      estado: form.estado?.trim().toUpperCase() || null,
      cnae_principal: form.cnae_principal?.trim() || null,
      porte: form.porte?.trim() || null,
      data_abertura: form.data_abertura || null,
      rota: formatarRota(form.rota),
      grupo_preco_id: form.grupo_preco_id || null,
      observacoes: form.observacoes?.trim() || null,
      consultado_receita_em: form.consultado_receita_em || null,
    };

    try {
      const consultaDuplicado = supabase
        .from("clientes")
        .select("id, nome")
        .eq("empresa_id", empresaId)
        .eq("cpf_cnpj", documento)
        .limit(1);

      if (documento) {
        const { data: duplicados } = editando
          ? await consultaDuplicado.neq("id", editando.id)
          : await consultaDuplicado;

        if (duplicados?.length) {
          throw new Error(`Este documento já está cadastrado para ${duplicados[0].nome}.`);
        }
      }

      const resultado = editando
        ? await supabase.from("clientes").update(payload).eq("id", editando.id).eq("empresa_id", empresaId)
        : await supabase.from("clientes").insert([{ ...payload, empresa_id: empresaId }]);

      if (resultado.error) throw resultado.error;

      await carregarDados();
      setMostrarModal(false);
      setForm(formInicial);
      setEditando(null);
    } catch (error) {
      setModalAviso({
        titulo: "Erro ao salvar",
        mensagem: error instanceof Error ? error.message : "Não foi possível salvar o cliente.",
      });
    } finally {
      setCarregando(false);
    }
  };

  const excluirCliente = (cliente: Cliente) => {
    setModalAviso({
      titulo: "Excluir cliente",
      mensagem: `Tem certeza que deseja excluir ${cliente.nome}?`,
      confirmar: async () => {
        const { error } = await supabase
          .from("clientes")
          .delete()
          .eq("id", cliente.id)
          .eq("empresa_id", empresaId);

        if (error) {
          setModalAviso({ titulo: "Erro", mensagem: error.message });
          return;
        }

        setClientes((atuais) => atuais.filter((item) => item.id !== cliente.id));
        setModalAviso(null);
      },
    });
  };

  const clientesFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return clientes.filter((cliente) => {
      const correspondeBusca = !termo || [
        cliente.nome,
        cliente.razao_social,
        cliente.nome_fantasia,
        cliente.cpf_cnpj,
        cliente.telefone,
        cliente.cidade,
      ].some((valor) => (valor || "").toLowerCase().includes(termo));

      return correspondeBusca
        && (!filtroTipo || cliente.tipo_pessoa === filtroTipo)
        && (!filtroRota || cliente.rota === filtroRota)
        && (!filtroCidade || cliente.cidade === filtroCidade);
    });
  }, [busca, clientes, filtroCidade, filtroRota, filtroTipo]);

  const rotas = useMemo(() => [...new Set(clientes.map((c) => c.rota).filter(Boolean))].sort(), [clientes]);
  const cidades = useMemo(() => [...new Set(clientes.map((c) => c.cidade || "").filter(Boolean))].sort(), [clientes]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  if (checkingAuth) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin" size={32} style={{ color: theme.menuBackgroundColor }} />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="flex min-h-screen" style={{ backgroundColor: theme.screenBackgroundColor }}>
      <Sidebar
        showMobileMenu={showMobileMenu}
        setShowMobileMenu={setShowMobileMenu}
        nomeEmpresa={nomeEmpresa || "Empresa"}
        expandido={sidebarExpandido}
        setExpandido={setSidebarExpandido}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <Header
          setShowMobileMenu={setShowMobileMenu}
          nomeEmpresa={nomeEmpresa}
          usuarioEmail={user.email || ""}
          handleSignOut={handleSignOut}
        />

        <main className="w-full flex-1 p-4 md:p-6 xl:p-8 2xl:p-10">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="flex items-center gap-2 text-sm font-medium text-slate-500">
                <UsersRound size={17} /> Cadastros
              </div>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 md:text-3xl">Clientes</h1>
              <p className="mt-1 text-sm text-slate-500">Consulte, cadastre e mantenha os dados comerciais em um só lugar.</p>
            </div>

            <button
              onClick={abrirNovo}
              className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:opacity-90"
              style={{ backgroundColor: theme.menuBackgroundColor }}
            >
              <Plus size={18} /> Novo cliente
            </button>
          </div>

          <section className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[
              { label: "Total de clientes", valor: clientes.length, icon: UsersRound },
              { label: "Pessoas jurídicas", valor: clientes.filter((c) => c.tipo_pessoa === "juridica").length, icon: Building2 },
              { label: "Pessoas físicas", valor: clientes.filter((c) => c.tipo_pessoa === "fisica").length, icon: UserRound },
              { label: "CNPJ ativo", valor: clientes.filter((c) => statusAtivo(c.situacao_cadastral)).length, icon: CheckCircle2 },
            ].map(({ label, valor, icon: Icon }) => (
              <div key={label} className="rounded-2xl border border-slate-200/70 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-medium text-slate-500">{label}</p>
                  <Icon size={17} className="text-slate-400" />
                </div>
                <p className="mt-3 text-2xl font-semibold text-slate-900">{valor}</p>
              </div>
            ))}
          </section>

          <section className="mt-5 rounded-2xl border border-slate-200/70 bg-white p-4 shadow-sm">
            <div className="grid gap-3 xl:grid-cols-[minmax(280px,1fr)_180px_180px_180px_auto]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  placeholder="Buscar por nome, CNPJ, telefone ou cidade..."
                  className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm outline-none transition focus:bg-white focus:ring-2"
                  style={{ "--tw-ring-color": `${theme.menuBackgroundColor}35` } as React.CSSProperties}
                />
              </div>

              <select value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value as "" | TipoPessoa)} className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-600 outline-none">
                <option value="">Todos os tipos</option>
                <option value="juridica">Pessoa jurídica</option>
                <option value="fisica">Pessoa física</option>
              </select>

              <select value={filtroRota} onChange={(e) => setFiltroRota(e.target.value)} className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-600 outline-none">
                <option value="">Todas as rotas</option>
                {rotas.map((rota) => <option key={rota} value={rota}>{rota}</option>)}
              </select>

              <select value={filtroCidade} onChange={(e) => setFiltroCidade(e.target.value)} className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-600 outline-none">
                <option value="">Todas as cidades</option>
                {cidades.map((cidade) => <option key={cidade} value={cidade}>{cidade}</option>)}
              </select>

              <button onClick={() => { setBusca(""); setFiltroTipo(""); setFiltroRota(""); setFiltroCidade(""); }} className="h-11 rounded-xl bg-slate-100 px-4 text-sm font-medium text-slate-600 hover:bg-slate-200">
                Limpar
              </button>
            </div>
          </section>

          <section className="mt-5 overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <h2 className="text-sm font-semibold text-slate-800">Clientes cadastrados</h2>
                <p className="mt-0.5 text-xs text-slate-500">{clientesFiltrados.length} de {clientes.length} registros</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] text-left text-sm">
                <thead className="bg-slate-50 text-xs font-medium uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-5 py-3">Cliente</th>
                    <th className="px-5 py-3">CNPJ/CPF</th>
                    <th className="px-5 py-3">TELEFONE</th>
                    <th className="px-5 py-3">Cidade</th>
                    <th className="px-5 py-3">Rota</th>
                    <th className="px-5 py-3">Tabela</th>
                    <th className="px-5 py-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {carregando ? (
                    <tr><td colSpan={7} className="px-5 py-12 text-center text-slate-500"><Loader2 className="mx-auto mb-2 animate-spin" />Carregando clientes...</td></tr>
                  ) : clientesFiltrados.length === 0 ? (
                    <tr><td colSpan={7} className="px-5 py-12 text-center text-slate-500">Nenhum cliente encontrado.</td></tr>
                  ) : clientesFiltrados.map((cliente) => (
                    <tr key={cliente.id} className="transition hover:bg-slate-50/70">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
                            {cliente.tipo_pessoa === "juridica" ? <Building2 size={17} /> : <UserRound size={17} />}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate font-medium text-slate-900">{cliente.nome}</p>
                            <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
                              {cliente.situacao_cadastral && (
                                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 ${statusAtivo(cliente.situacao_cadastral) ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                                  <span className="h-1.5 w-1.5 rounded-full bg-current" />{cliente.situacao_cadastral}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-slate-600">{formatarDocumento(cliente.cpf_cnpj || "", cliente.tipo_pessoa || "juridica") || "—"}</td>
                      <td className="px-5 py-4 text-slate-600">{cliente.telefone || cliente.email || "—"}</td>
                      <td className="px-5 py-4 text-slate-600">{[cliente.cidade, cliente.estado].filter(Boolean).join("/ ") || "—"}</td>
                      <td className="px-5 py-4"><span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">{cliente.rota}</span></td>
                      <td className="px-5 py-4 text-slate-600">{grupos.find((g) => g.id === cliente.grupo_preco_id)?.nome || "Padrão"}</td>
                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-1">
                          <button onClick={() => abrirEdicao(cliente)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" title="Editar"><Edit2 size={17} /></button>
                          <button onClick={() => excluirCliente(cliente)} className="rounded-lg p-2 text-rose-500 hover:bg-rose-50" title="Excluir"><Trash2 size={17} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </main>
      </div>

      {showScrollTop && (
        <button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} className="fixed bottom-6 right-6 z-40 rounded-full p-3 text-white shadow-lg" style={{ backgroundColor: theme.menuBackgroundColor }} title="Voltar ao topo">
          <ChevronDown className="rotate-180" size={20} />
        </button>
      )}

      {mostrarModal && (
        <div className="fixed inset-0 z-50 flex items-stretch justify-end bg-slate-950/35 backdrop-blur-[2px]">
          <div className="flex h-full w-full max-w-5xl flex-col bg-slate-50 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4 md:px-7">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">{editando ? "Editar cliente" : "Novo cliente"}</h2>
                <p className="mt-0.5 text-xs text-slate-500">Os dados fiscais podem ser preenchidos automaticamente pelo CNPJ.</p>
              </div>
              <button onClick={fecharModal} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><X size={21} /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 md:p-7">
              <div className="mx-auto max-w-4xl space-y-5">
                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center gap-2">
                    <FileSearch size={18} style={{ color: theme.menuBackgroundColor }} />
                    <h3 className="text-sm font-semibold text-slate-800">Identificação</h3>
                  </div>

                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <div className="md:col-span-2">
                      <label className="mb-2 block text-xs font-medium text-slate-600">Tipo de cliente</label>
                      <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1">
                        {(["juridica", "fisica"] as TipoPessoa[]).map((tipo) => (
                          <button
                            key={tipo}
                            onClick={() => {
                              setForm((atual) => ({ ...atual, tipo_pessoa: tipo, cpf_cnpj: "", situacao_cadastral: "" }));
                              setCnpjConsultado(false);
                              setErroCnpj("");
                              ultimaConsultaRef.current = "";
                            }}
                            className={`rounded-lg px-3 py-2 text-sm font-medium transition ${form.tipo_pessoa === tipo ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}
                          >
                            {tipo === "juridica" ? "Pessoa jurídica" : "Pessoa física"}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="md:col-span-2">
                      <label className="mb-1.5 block text-xs font-medium text-slate-600">{form.tipo_pessoa === "juridica" ? "CNPJ" : "CPF"}</label>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <input
                            value={form.cpf_cnpj || ""}
                            onChange={(e) => {
                              const valor = formatarDocumento(e.target.value, form.tipo_pessoa);
                              setForm((atual) => ({ ...atual, cpf_cnpj: valor }));
                              if (somenteNumeros(valor) !== ultimaConsultaRef.current) setCnpjConsultado(false);
                            }}
                            placeholder={form.tipo_pessoa === "juridica" ? "00.000.000/0000-00" : "000.000.000-00"}
                            className="h-11 w-full rounded-xl border border-slate-200 px-3 pr-10 text-sm outline-none focus:ring-2"
                            style={{ "--tw-ring-color": `${theme.menuBackgroundColor}30` } as React.CSSProperties}
                          />
                          {consultandoCnpj && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-slate-400" size={18} />}
                        </div>
                        {form.tipo_pessoa === "juridica" && (
                          <button
                            onClick={() => consultarCnpj()}
                            disabled={consultandoCnpj || somenteNumeros(form.cpf_cnpj || "").length !== 14}
                            className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <Search size={17} /> Consultar
                          </button>
                        )}
                      </div>

                      {consultandoCnpj && <p className="mt-2 text-xs text-slate-500">Consultando dados cadastrais...</p>}
                      {cnpjConsultado && !erroCnpj && (
                        <div className="mt-3 flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2.5 text-xs font-medium text-emerald-700">
                          <CheckCircle2 size={16} /> Empresa encontrada e campos preenchidos automaticamente.
                        </div>
                      )}
                      {erroCnpj && (
                        <div className="mt-3 flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2.5 text-xs text-amber-700">
                          <AlertCircle className="mt-0.5 shrink-0" size={16} />
                          <span>{erroCnpj} Você ainda pode preencher os dados manualmente.</span>
                        </div>
                      )}
                    </div>

                    <Campo label="Nome usado no sistema *" value={form.nome} onChange={(valor) => setForm((atual) => ({ ...atual, nome: valor }))} placeholder="Nome do cliente" />
                    <Campo label="Razão social" value={form.razao_social || ""} onChange={(valor) => setForm((atual) => ({ ...atual, razao_social: valor }))} />
                    <Campo label="Nome fantasia" value={form.nome_fantasia || ""} onChange={(valor) => setForm((atual) => ({ ...atual, nome_fantasia: valor }))} />
                    <Campo label="Situação cadastral" value={form.situacao_cadastral || ""} onChange={(valor) => setForm((atual) => ({ ...atual, situacao_cadastral: valor }))} />
                    <Campo label="Porte" value={form.porte || ""} onChange={(valor) => setForm((atual) => ({ ...atual, porte: valor }))} />
                    <Campo label="Data de abertura" type="date" value={form.data_abertura || ""} onChange={(valor) => setForm((atual) => ({ ...atual, data_abertura: valor }))} />
                    <div className="md:col-span-2"><Campo label="Atividade principal / CNAE" value={form.cnae_principal || ""} onChange={(valor) => setForm((atual) => ({ ...atual, cnae_principal: valor }))} /></div>
                  </div>
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center gap-2"><Phone size={18} className="text-slate-500" /><h3 className="text-sm font-semibold text-slate-800">Contato</h3></div>
                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <Campo label="Telefone" value={form.telefone || ""} onChange={(valor) => setForm((atual) => ({ ...atual, telefone: formatarTelefone(valor) }))} placeholder="(00) 00000-0000" />
                    <Campo label="E-mail" type="email" value={form.email || ""} onChange={(valor) => setForm((atual) => ({ ...atual, email: valor }))} placeholder="cliente@empresa.com.br" />
                  </div>
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center gap-2"><MapPin size={18} className="text-slate-500" /><h3 className="text-sm font-semibold text-slate-800">Endereço</h3></div>
                  <div className="mt-4 grid gap-4 md:grid-cols-6">
                    <div className="md:col-span-2"><Campo label="CEP" value={form.cep || ""} onChange={(valor) => setForm((atual) => ({ ...atual, cep: formatarCep(valor) }))} placeholder="00000-000" /></div>
                    <div className="md:col-span-3"><Campo label="Logradouro" value={form.logradouro || ""} onChange={(valor) => setForm((atual) => ({ ...atual, logradouro: valor }))} /></div>
                    <div><Campo label="Número" value={form.numero || ""} onChange={(valor) => setForm((atual) => ({ ...atual, numero: valor }))} /></div>
                    <div className="md:col-span-2"><Campo label="Bairro" value={form.bairro || ""} onChange={(valor) => setForm((atual) => ({ ...atual, bairro: valor }))} /></div>
                    <div className="md:col-span-2"><Campo label="Cidade" value={form.cidade || ""} onChange={(valor) => setForm((atual) => ({ ...atual, cidade: valor }))} /></div>
                    <div><Campo label="UF" value={form.estado || ""} onChange={(valor) => setForm((atual) => ({ ...atual, estado: valor.toUpperCase().slice(0, 2) }))} /></div>
                    <div className="md:col-span-1"><Campo label="Complemento" value={form.complemento || ""} onChange={(valor) => setForm((atual) => ({ ...atual, complemento: valor }))} /></div>
                  </div>
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center gap-2"><Building2 size={18} className="text-slate-500" /><h3 className="text-sm font-semibold text-slate-800">Configurações comerciais</h3></div>
                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <Campo label="Rota *" value={form.rota} onChange={(valor) => setForm((atual) => ({ ...atual, rota: valor }))} placeholder="Ex.: 05 ou Rota Oeste" />
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-slate-600">Tabela de preços</label>
                      <select value={form.grupo_preco_id || ""} onChange={(e) => setForm((atual) => ({ ...atual, grupo_preco_id: e.target.value || null }))} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none">
                        <option value="">Tabela padrão</option>
                        {grupos.map((grupo) => <option key={grupo.id} value={grupo.id}>{grupo.nome}</option>)}
                      </select>
                    </div>
                    <div className="md:col-span-2">
                      <label className="mb-1.5 block text-xs font-medium text-slate-600">Observações</label>
                      <textarea value={form.observacoes || ""} onChange={(e) => setForm((atual) => ({ ...atual, observacoes: e.target.value }))} rows={4} className="w-full resize-none rounded-xl border border-slate-200 p-3 text-sm outline-none focus:ring-2" style={{ "--tw-ring-color": `${theme.menuBackgroundColor}30` } as React.CSSProperties} placeholder="Informações comerciais, horários, restrições de entrega..." />
                    </div>
                  </div>
                </section>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-slate-200 bg-white px-5 py-4 md:px-7">
              <button onClick={fecharModal} className="rounded-xl bg-slate-100 px-5 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-200">Cancelar</button>
              <button onClick={salvarCliente} disabled={carregando || consultandoCnpj} className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-medium text-white disabled:opacity-60" style={{ backgroundColor: theme.menuBackgroundColor }}>
                {carregando && <Loader2 size={17} className="animate-spin" />}{editando ? "Salvar alterações" : "Cadastrar cliente"}
              </button>
            </div>
          </div>
        </div>
      )}

      <CadastrosAvisoModal
        aviso={modalAviso}
        onClose={() => setModalAviso(null)}
        colors={{
          bg: theme.modalBackgroundColor,
          text: theme.modalTextColor,
          primaryButtonBg: theme.modalButtonBackgroundColor,
          primaryButtonText: theme.modalButtonTextColor,
          success: theme.modalIconSuccessColor,
          error: theme.modalIconErrorColor,
          warning: theme.modalIconWarningColor,
        }}
      />
    </div>
  );
}

function Campo({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (valor: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-slate-600">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm text-slate-700 outline-none transition focus:border-slate-300 focus:ring-2 focus:ring-slate-200"
      />
    </div>
  );
}