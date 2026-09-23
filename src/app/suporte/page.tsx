"use client";

import {
  Headphones,
  Plus,
  MessageSquare,
  Paperclip,
  FileText,
  Image as ImageIcon,
  ExternalLink,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/hooks/useAuth";
import Header from "@/components/Header";
import { supabase } from "@/lib/supabaseClient";

type AnexoSuporte = {
  id: string;
  chamado_id: string;
  nome_arquivo: string;
  caminho_storage: string;
  tipo_arquivo: string | null;
  tamanho_bytes: number | null;
};

type ChamadoSuporte = {
  id: string;
  titulo: string;
  mensagem: string;
  categoria: string;
  status: string;
  prioridade: string;
  created_at: string;
  anexos: AnexoSuporte[];
};

export default function SuportePage() {
  const { theme } = useTheme();
const [novoChamadoAberto, setNovoChamadoAberto] = useState(false);
const [anexos, setAnexos] = useState<File[]>([]);
const [categoria, setCategoria] = useState("duvida");
const [titulo, setTitulo] = useState("");
const [mensagem, setMensagem] = useState("");
const [enviando, setEnviando] = useState(false);
const [erroEnvio, setErroEnvio] = useState("");
const [chamados, setChamados] = useState<ChamadoSuporte[]>([]);
const [carregandoChamados, setCarregandoChamados] = useState(true);
const {
  user,
  nomeEmpresa,
  empresaId,
  loading,
  signOut,
} = useAuth();


useEffect(() => {
  if (!loading && user && empresaId) {
    void carregarChamados();
  }
}, [loading, user?.id, empresaId]);

  if (loading) {
    return (
      <div
        className="flex min-h-screen items-center justify-center"
        style={{
          background: "#F6F8F8",
        }}
      >
        <div
          className="h-9 w-9 animate-spin rounded-full border-4"
          style={{
            borderColor: "#DCE2E4",
            borderTopColor: "#C8D463",
          }}
        />
      </div>
    );
  }

  if (!user) return null;
  const adicionarAnexos = (
  event: React.ChangeEvent<HTMLInputElement>
) => {
  const arquivos = Array.from(event.target.files || []);

  const permitidos = arquivos.filter((arquivo) => {
    const tipoPermitido = [
      "application/pdf",
      "image/png",
      "image/jpeg",
      "image/webp",
    ].includes(arquivo.type);

    const tamanhoPermitido =
      arquivo.size <= 10 * 1024 * 1024;

    return tipoPermitido && tamanhoPermitido;
  });

  setAnexos((atuais) => [
    ...atuais,
    ...permitidos,
  ]);

  event.target.value = "";
};

const removerAnexo = (index: number) => {
  setAnexos((atuais) =>
    atuais.filter((_, i) => i !== index)
  );
};

const carregarChamados = async () => {
  if (!empresaId) return;
  try {
    setCarregandoChamados(true);
    const { data: chamadosData, error: chamadosError } = await supabase
      .from("suporte_chamados")
      .select("id, titulo, mensagem, categoria, status, prioridade, created_at")
      .eq("empresa_id", empresaId)
      .order("created_at", { ascending: false });
    if (chamadosError) throw chamadosError;

    const ids = (chamadosData ?? []).map((c) => c.id);
    let anexosData: AnexoSuporte[] = [];
    if (ids.length > 0) {
      const { data, error } = await supabase
        .from("suporte_anexos")
        .select("id, chamado_id, nome_arquivo, caminho_storage, tipo_arquivo, tamanho_bytes")
        .in("chamado_id", ids)
        .order("created_at", { ascending: true });
      if (error) throw error;
      anexosData = (data ?? []) as AnexoSuporte[];
    }

    setChamados((chamadosData ?? []).map((c) => ({
      ...c,
      anexos: anexosData.filter((a) => a.chamado_id === c.id),
    })) as ChamadoSuporte[]);
  } catch (error) {
    console.error("Erro ao carregar chamados:", error);
  } finally {
    setCarregandoChamados(false);
  }
};

const abrirAnexo = async (caminhoStorage: string) => {
  try {
    const { data, error } = await supabase.storage
      .from("suporte-anexos")
      .createSignedUrl(caminhoStorage, 60);
    if (error) throw error;
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  } catch (error) {
    console.error("Erro ao abrir anexo:", error);
  }
};

const handleEnviarChamado = async () => {
  if (!user || !empresaId) return;
  if (!titulo.trim() || !mensagem.trim()) {
    setErroEnvio("Preencha o assunto e descreva o que aconteceu.");
    return;
  }

  try {
    setEnviando(true);
    setErroEnvio("");

    const { data: chamadoCriado, error: chamadoError } = await supabase
      .from("suporte_chamados")
      .insert({
        empresa_id: empresaId,
        usuario_id: user.id,
        titulo: titulo.trim(),
        mensagem: mensagem.trim(),
        categoria,
      })
      .select("id")
      .single();

    if (chamadoError) throw chamadoError;

    for (const arquivo of anexos) {
      const extensao = arquivo.name.includes(".")
        ? arquivo.name.split(".").pop()?.toLowerCase()
        : undefined;
      const nomeSeguro = `${crypto.randomUUID()}${extensao ? `.${extensao}` : ""}`;
      const caminhoStorage = `${empresaId}/${chamadoCriado.id}/${nomeSeguro}`;

      const { error: uploadError } = await supabase.storage
        .from("suporte-anexos")
        .upload(caminhoStorage, arquivo, {
          contentType: arquivo.type || undefined,
          upsert: false,
        });
      if (uploadError) throw uploadError;

      const { error: anexoError } = await supabase
        .from("suporte_anexos")
        .insert({
          chamado_id: chamadoCriado.id,
          empresa_id: empresaId,
          usuario_id: user.id,
          nome_arquivo: arquivo.name,
          caminho_storage: caminhoStorage,
          tipo_arquivo: arquivo.type || null,
          tamanho_bytes: arquivo.size,
        });

      if (anexoError) {
        await supabase.storage.from("suporte-anexos").remove([caminhoStorage]);
        throw anexoError;
      }
    }

    await carregarChamados();
    setCategoria("duvida");
    setTitulo("");
    setMensagem("");
    setAnexos([]);
    setNovoChamadoAberto(false);
  } catch (error) {
    console.error("Erro ao enviar chamado:", error);
    setErroEnvio("Não foi possível enviar o chamado ou algum anexo. Tente novamente.");
    await carregarChamados();
  } finally {
    setEnviando(false);
  }
};

  return (
    <div className="min-h-screen bg-[#F6F8F8]">

      {/* HEADER DO SISTEMA */}
      <Header
        nomeEmpresa={nomeEmpresa}
        usuarioEmail={user.email ?? ""}
        handleSignOut={signOut}
      />

      <main
        className="min-h-screen px-6 py-8 md:px-10"
        style={{
          background: "#F6F8F8",
          color: theme.contentTextLightBg,
        }}
      >
        <div className="mx-auto w-full max-w-[1500px]">

          {/* CABEÇALHO DA PÁGINA */}
          <div className="mb-8 flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="mb-2 flex items-center gap-2">
                <Headphones
                  size={18}
                  color="#C8D463"
                />

                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8F9AA1]">
                  Central de atendimento
                </span>
              </div>

              <h1 className="text-3xl font-semibold tracking-[-0.03em]">
                Suporte Glass Code
              </h1>

              <p className="mt-2 max-w-2xl text-sm text-[#8F9AA1]">
                Precisa de ajuda com o sistema? Abra um chamado e acompanhe
                seu atendimento por aqui.
              </p>
            </div>

       <button
  type="button"
  onClick={() => setNovoChamadoAberto(true)}
  className="
    flex h-11 items-center justify-center gap-2
    rounded-xl bg-[#C8D463]
    px-5 text-sm font-semibold text-[#38444B]
    transition hover:brightness-95
  "
>
  <Plus size={17} />
  Novo chamado
</button>
</div>
{novoChamadoAberto && (
  <section
    className="
      mb-6 rounded-2xl border border-[#DCE2E4]
      bg-white p-6
    "
  >
    <div className="mb-6 flex items-start justify-between gap-4">
      <div>
        <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8F9AA1]">
          Novo atendimento
        </span>

        <h2 className="mt-1 text-xl font-semibold text-[#38444B]">
          Como podemos ajudar?
        </h2>

        <p className="mt-1 text-sm text-[#8F9AA1]">
          Conte o que está acontecendo no Glass Code.
        </p>
      </div>

      <button
        type="button"
        onClick={() => setNovoChamadoAberto(false)}
        className="
          rounded-lg border border-[#DCE2E4]
          px-3 py-2 text-sm font-medium text-[#8F9AA1]
          transition hover:bg-[#F6F8F8]
        "
      >
        Cancelar
      </button>
    </div>

    <div className="grid gap-5">
      <div>
        <label
          htmlFor="categoria"
          className="mb-2 block text-sm font-semibold text-[#38444B]"
        >
          Categoria
        </label>

        <select
          id="categoria"
          className="
            h-11 w-full rounded-xl border border-[#DCE2E4]
            bg-white px-3 text-sm text-[#38444B]
            outline-none focus:border-[#C8D463]
          "
      value={categoria}
onChange={(e) => setCategoria(e.target.value)}
        >
          <option value="duvida">Dúvida</option>
          <option value="problema">Problema no sistema</option>
          <option value="configuracao">Configuração</option>
          <option value="sugestao">Sugestão</option>
          <option value="outro">Outro</option>
        </select>
      </div>

      <div>
        <label
          htmlFor="titulo"
          className="mb-2 block text-sm font-semibold text-[#38444B]"
        >
          Assunto
        </label>

        <input
          id="titulo"
          type="text"
          placeholder="Ex.: Problema ao calcular um orçamento"
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          className="
            h-11 w-full rounded-xl border border-[#DCE2E4]
            bg-white px-3 text-sm text-[#38444B]
            outline-none placeholder:text-[#8F9AA1]
            focus:border-[#C8D463]
          "
        />
      </div>

      <div>
        <label
          htmlFor="mensagem"
          className="mb-2 block text-sm font-semibold text-[#38444B]"
        >
          Descreva o que aconteceu
        </label>

        <textarea
          id="mensagem"
          rows={6}
          placeholder="Explique sua dificuldade com o máximo de detalhes que puder..."
          value={mensagem}
          onChange={(e) => setMensagem(e.target.value)}
          className="
            w-full resize-none rounded-xl border border-[#DCE2E4]
            bg-white p-3 text-sm text-[#38444B]
            outline-none placeholder:text-[#8F9AA1]
            focus:border-[#C8D463]
          "
        />
      </div>
      <div>
  <label className="mb-2 block text-sm font-semibold text-[#38444B]">
    Anexos
  </label>

  <label
    htmlFor="suporte-anexos"
    className="
      flex cursor-pointer items-center justify-center gap-2
      rounded-xl border border-dashed border-[#8F9AA1]/50
      bg-[#F6F8F8] px-4 py-5
      text-sm font-medium text-[#38444B]
      transition
      hover:border-[#C8D463]
      hover:bg-[#C8D463]/5
    "
  >
    <Paperclip size={18} />

    <span>
      Adicionar imagem ou PDF
    </span>

    <input
      id="suporte-anexos"
      type="file"
      multiple
      accept=".pdf,.png,.jpg,.jpeg,.webp"
      onChange={adicionarAnexos}
      className="hidden"
    />
  </label>

  <p className="mt-2 text-xs text-[#8F9AA1]">
    PDF, PNG, JPG ou WEBP · máximo de 10 MB por arquivo.
  </p>

  {anexos.length > 0 && (
    <div className="mt-4 grid gap-2">
      {anexos.map((arquivo, index) => (
        <div
          key={`${arquivo.name}-${index}`}
          className="
            flex items-center justify-between gap-3
            rounded-xl border border-[#DCE2E4]
            bg-white px-4 py-3
          "
        >
          <div className="flex min-w-0 items-center gap-3">
            <div
              className="
                flex h-9 w-9 shrink-0 items-center
                justify-center rounded-lg
                bg-[#38444B]
              "
            >
              <Paperclip
                size={16}
                color="#C8D463"
              />
            </div>

            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-[#38444B]">
                {arquivo.name}
              </p>

              <p className="text-xs text-[#8F9AA1]">
                {(arquivo.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => removerAnexo(index)}
            aria-label={`Remover ${arquivo.name}`}
            className="
              flex h-8 w-8 shrink-0 items-center
              justify-center rounded-lg
              text-[#8F9AA1] transition
              hover:bg-[#F6F8F8]
              hover:text-[#38444B]
            "
          >
            <X size={16} />
          </button>
        </div>
      ))}
    </div>
  )}
</div>

      {erroEnvio && (
        <div
          className="
            rounded-xl border border-red-200
            bg-red-50 px-4 py-3
            text-sm text-red-700
          "
        >
          {erroEnvio}
        </div>
      )}

      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleEnviarChamado}
          disabled={enviando}
          className="
            flex h-11 items-center justify-center gap-2
            rounded-xl bg-[#38444B]
            px-5 text-sm font-semibold text-white
            transition hover:brightness-110
          "
        >
          <MessageSquare size={17} color="#C8D463" />
          {enviando ? "Enviando..." : "Enviar chamado"}
        </button>
      </div>
    </div>
  </section>
)}
        

          {/* HISTÓRICO DE CHAMADOS */}
          {carregandoChamados ? (
            <section className="rounded-2xl border border-[#DCE2E4] bg-white px-6 py-12 text-center">
              <div
                className="mx-auto h-8 w-8 animate-spin rounded-full border-4"
                style={{
                  borderColor: "#DCE2E4",
                  borderTopColor: "#C8D463",
                }}
              />
              <p className="mt-3 text-sm text-[#8F9AA1]">
                Carregando seus chamados...
              </p>
            </section>
          ) : chamados.length > 0 ? (
            <section>
              <div className="mb-4 flex items-end justify-between gap-4">
                <div>
                  <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8F9AA1]">
                    Histórico
                  </span>
                  <h2 className="mt-1 text-xl font-semibold text-[#38444B]">
                    Seus chamados
                  </h2>
                </div>

                <span className="text-sm text-[#8F9AA1]">
                  {chamados.length} {chamados.length === 1 ? "chamado" : "chamados"}
                </span>
              </div>

              <div className="grid gap-3">
                {chamados.map((chamado) => {
                  const statusLabel: Record<string, string> = {
                    novo: "Novo",
                    em_analise: "Em análise",
                    em_atendimento: "Em atendimento",
                    aguardando_cliente: "Aguardando cliente",
                    resolvido: "Resolvido",
                  };

                  const categoriaLabel: Record<string, string> = {
                    duvida: "Dúvida",
                    problema: "Problema no sistema",
                    configuracao: "Configuração",
                    sugestao: "Sugestão",
                    outro: "Outro",
                  };

                  const dataChamado = new Intl.DateTimeFormat("pt-BR", {
                    dateStyle: "short",
                    timeStyle: "short",
                  }).format(new Date(chamado.created_at));

                  return (
                    <article
                      key={chamado.id}
                      className="
                        rounded-2xl border border-[#DCE2E4]
                        bg-white p-5 transition
                        hover:border-[#8F9AA1]/50
                      "
                    >
                      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                        <div className="min-w-0">
                          <div className="mb-2 flex flex-wrap items-center gap-2">
                            <span className="rounded-full bg-[#F6F8F8] px-2.5 py-1 text-xs font-semibold text-[#8F9AA1]">
                              {categoriaLabel[chamado.categoria] ?? chamado.categoria}
                            </span>

                            <span className="rounded-full bg-[#C8D463]/20 px-2.5 py-1 text-xs font-semibold text-[#38444B]">
                              {statusLabel[chamado.status] ?? chamado.status}
                            </span>
                          </div>

                          <h3 className="text-base font-semibold text-[#38444B]">
                            {chamado.titulo}
                          </h3>

                          <p className="mt-1 line-clamp-2 text-sm leading-6 text-[#8F9AA1]">
                            {chamado.mensagem}
                          </p>

                          {chamado.anexos.length > 0 && (
                            <div className="mt-4">
                              <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#8F9AA1]">
                                <Paperclip size={13} />
                                {chamado.anexos.length} {chamado.anexos.length === 1 ? "anexo" : "anexos"}
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {chamado.anexos.map((anexo) => {
                                  const ehImagem = anexo.tipo_arquivo?.startsWith("image/") ?? false;
                                  return (
                                    <button
                                      key={anexo.id}
                                      type="button"
                                      onClick={() => void abrirAnexo(anexo.caminho_storage)}
                                      className="flex max-w-full items-center gap-2 rounded-xl border border-[#DCE2E4] bg-[#F6F8F8] px-3 py-2 text-left text-xs font-medium text-[#38444B] transition hover:border-[#C8D463] hover:bg-[#C8D463]/10"
                                      title={`Abrir ${anexo.nome_arquivo}`}
                                    >
                                      {ehImagem ? <ImageIcon size={15} color="#8F9AA1" /> : <FileText size={15} color="#8F9AA1" />}
                                      <span className="max-w-[260px] truncate">{anexo.nome_arquivo}</span>
                                      <ExternalLink size={13} color="#8F9AA1" />
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>

                        <time
                          dateTime={chamado.created_at}
                          className="shrink-0 text-xs text-[#8F9AA1]"
                        >
                          {dataChamado}
                        </time>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          ) : (
            <section
              className="
                relative overflow-hidden rounded-2xl border
                border-[#DCE2E4] bg-white
                px-6 py-16 text-center
              "
            >
              {/* MARCA D'ÁGUA GLASS CODE */}
              <div
                className="pointer-events-none absolute inset-0 overflow-hidden"
                aria-hidden="true"
              >
                <div
                  className="
                    absolute -right-[30px] -top-[90px]
                    h-[230px] w-[230px]
                    rounded-[10px]
                    border border-[#8F9AA1]/10
                    bg-[#8F9AA1]/[0.02]
                    [transform:skewY(-28deg)]
                  "
                />

                <div
                  className="
                    absolute -right-[110px] top-[15px]
                    h-[230px] w-[230px]
                    rounded-[10px]
                    border border-[#C8D463]/20
                    bg-[#C8D463]/[0.025]
                    [transform:skewY(-28deg)]
                  "
                />
              </div>

              <div className="relative z-10 mx-auto max-w-md">
                <div
                  className="
                    mx-auto mb-5 flex h-12 w-12
                    items-center justify-center
                    rounded-xl bg-[#38444B]
                  "
                >
                  <MessageSquare size={21} color="#C8D463" />
                </div>

                <h2 className="text-lg font-semibold text-[#38444B]">
                  Seus chamados aparecerão aqui
                </h2>

                <p className="mt-2 text-sm leading-6 text-[#8F9AA1]">
                  Quando precisar de ajuda, abra um chamado para nossa equipe.
                  Você poderá acompanhar as respostas e o andamento do
                  atendimento nesta página.
                </p>
              </div>
            </section>
          )}
        </div>
      </main>
    </div>
  );
}