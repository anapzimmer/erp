"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { formatarNomePadrao } from "@/utils/formatarNome";

type ClienteCriado = {
  id: string;
  nome: string;
  rota?: string | null;
  grupo_preco_id?: string | null;
};

type TabelaPreco = {
  id: string;
  nome: string;
};

type NovoClienteForm = {
  tipo_pessoa: "juridica" | "fisica";
  cpf_cnpj: string;
  nome: string;
  rota: string;
  grupo_preco_id: string;
  telefone: string;
  email: string;
  cidade: string;
  estado: string;
};

type Props = {
  empresaId?: string | null;
  onClientCreated: (cliente: ClienteCriado) => void;
  onError?: (mensagem: string) => void;
  disabled?: boolean;
};

const estadoInicial: NovoClienteForm = {
  tipo_pessoa: "juridica",
  cpf_cnpj: "",
  nome: "",
  rota: "",
  grupo_preco_id: "",
  telefone: "",
  email: "",
  cidade: "",
  estado: "",
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

const formatarDocumento = (valor: string, tipo: "juridica" | "fisica") =>
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

export default function ClienteQuickCreateButton({ empresaId, onClientCreated, onError, disabled }: Props) {
  const [aberto, setAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [form, setForm] = useState<NovoClienteForm>(estadoInicial);
  const [tabelas, setTabelas] = useState<TabelaPreco[]>([]);

  useEffect(() => {
    if (!aberto || !empresaId) return;
    let cancelado = false;

    supabase
      .from("tabelas")
      .select("id, nome")
      .eq("empresa_id", empresaId)
      .order("nome", { ascending: true })
      .then(({ data, error }) => {
        if (cancelado) return;
        if (error) {
          onError?.("Não foi possível carregar as tabelas de preço.");
          setTabelas([]);
          return;
        }
        setTabelas((data || []) as TabelaPreco[]);
      });

    return () => {
      cancelado = true;
    };
  }, [aberto, empresaId, onError]);

  const podeSalvar = useMemo(() => !salvando && !!empresaId, [empresaId, salvando]);

  const salvar = async () => {
    if (!empresaId) {
      onError?.("Empresa não encontrada para cadastrar cliente.");
      return;
    }

    if (!form.nome.trim() || !form.rota.trim()) {
      onError?.("Informe pelo menos nome e rota do cliente.");
      return;
    }

    const documento = somenteNumeros(form.cpf_cnpj || "");
    if (documento && form.tipo_pessoa === "juridica" && documento.length !== 14) {
      onError?.("Informe um CNPJ com 14 números.");
      return;
    }
    if (documento && form.tipo_pessoa === "fisica" && documento.length !== 11) {
      onError?.("Informe um CPF com 11 números.");
      return;
    }

    setSalvando(true);

    try {
      if (documento) {
        const { data: duplicado, error: erroDuplicado } = await supabase
          .from("clientes")
          .select("id, nome")
          .eq("empresa_id", empresaId)
          .eq("cpf_cnpj", documento)
          .limit(1);

        if (erroDuplicado) throw erroDuplicado;
        if (duplicado?.length) {
          throw new Error(`Documento já cadastrado para ${duplicado[0].nome}.`);
        }
      }

      const payload = {
        empresa_id: empresaId,
        tipo_pessoa: form.tipo_pessoa,
        cpf_cnpj: documento || null,
        nome: formatarNomePadrao(form.nome),
        rota: form.rota.trim(),
        grupo_preco_id: form.grupo_preco_id || null,
        telefone: form.telefone.trim() || null,
        email: form.email.trim().toLowerCase() || null,
        cidade: form.cidade ? formatarNomePadrao(form.cidade) : null,
        estado: form.estado.trim().toUpperCase().slice(0, 2) || null,
      };

      const { data: clienteInserido, error: erroInsercao } = await supabase
        .from("clientes")
        .insert([payload])
        .select("id, nome, rota, grupo_preco_id")
        .single();

      if (erroInsercao) throw erroInsercao;
      if (!clienteInserido) throw new Error("Cliente não retornado após cadastro.");

      onClientCreated({
        id: String(clienteInserido.id),
        nome: String(clienteInserido.nome),
        rota: clienteInserido.rota ?? null,
        grupo_preco_id: clienteInserido.grupo_preco_id ?? null,
      });

      setForm(estadoInicial);
      setAberto(false);
    } catch (error) {
      onError?.(error instanceof Error ? error.message : "Não foi possível cadastrar o cliente.");
    } finally {
      setSalvando(false);
    }
  };

  return (
    <>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setAberto(true)}
        className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-slate-300 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
        title="Cadastrar novo cliente"
      >
        <Plus size={13} />
      </button>

      {aberto && (
        <div className="fixed inset-0 z-[220] flex items-center justify-center bg-slate-950/35 p-4 backdrop-blur-[2px]">
          <section className="relative z-[221] w-full max-w-3xl rounded-2xl border border-slate-200 bg-slate-50 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4 md:px-6">
              <h2 className="text-base font-semibold text-slate-900">Cadastrar cliente</h2>
              <button
                type="button"
                onClick={() => {
                  if (salvando) return;
                  setAberto(false);
                }}
                className="rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Fechar
              </button>
            </div>

            <div className="max-h-[75vh] overflow-y-auto p-4 md:p-6">
              <div className="space-y-4">
                <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <h3 className="text-sm font-semibold text-slate-800">Identificação</h3>
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Tipo
                      <select
                        value={form.tipo_pessoa}
                        onChange={(e) => setForm((atual) => ({ ...atual, tipo_pessoa: e.target.value as "juridica" | "fisica", cpf_cnpj: "" }))}
                        className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-700 outline-none"
                      >
                        <option value="juridica">Pessoa jurídica</option>
                        <option value="fisica">Pessoa física</option>
                      </select>
                    </label>

                    <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      {form.tipo_pessoa === "juridica" ? "CNPJ" : "CPF"}
                      <input
                        value={form.cpf_cnpj}
                        onChange={(e) => setForm((atual) => ({ ...atual, cpf_cnpj: formatarDocumento(e.target.value, atual.tipo_pessoa) }))}
                        placeholder={form.tipo_pessoa === "juridica" ? "00.000.000/0000-00" : "000.000.000-00"}
                        className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-700 outline-none"
                      />
                    </label>

                    <label className="md:col-span-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Nome do cliente *
                      <input
                        value={form.nome}
                        onChange={(e) => setForm((atual) => ({ ...atual, nome: e.target.value }))}
                        placeholder="Nome do cliente"
                        className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-700 outline-none"
                      />
                    </label>

                    <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Rota *
                      <input
                        value={form.rota}
                        onChange={(e) => setForm((atual) => ({ ...atual, rota: e.target.value }))}
                        placeholder="Ex.: 05MM"
                        className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-700 outline-none"
                      />
                    </label>

                    <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Tabela de preços
                      <select
                        value={form.grupo_preco_id}
                        onChange={(e) => setForm((atual) => ({ ...atual, grupo_preco_id: e.target.value }))}
                        className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-700 outline-none"
                      >
                        <option value="">Tabela padrão</option>
                        {tabelas.map((tabela) => (
                          <option key={tabela.id} value={tabela.id}>{tabela.nome}</option>
                        ))}
                      </select>
                    </label>
                  </div>
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <h3 className="text-sm font-semibold text-slate-800">Contato</h3>
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Telefone
                      <input
                        value={form.telefone}
                        onChange={(e) => setForm((atual) => ({ ...atual, telefone: formatarTelefone(e.target.value) }))}
                        placeholder="(00) 00000-0000"
                        className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-700 outline-none"
                      />
                    </label>

                    <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      E-mail
                      <input
                        type="email"
                        value={form.email}
                        onChange={(e) => setForm((atual) => ({ ...atual, email: e.target.value }))}
                        placeholder="cliente@empresa.com"
                        className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-700 outline-none"
                      />
                    </label>
                  </div>
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <h3 className="text-sm font-semibold text-slate-800">Endereço</h3>
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Cidade
                      <input
                        value={form.cidade}
                        onChange={(e) => setForm((atual) => ({ ...atual, cidade: e.target.value }))}
                        className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-700 outline-none"
                      />
                    </label>

                    <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      UF
                      <input
                        value={form.estado}
                        onChange={(e) => setForm((atual) => ({ ...atual, estado: e.target.value.toUpperCase().slice(0, 2) }))}
                        className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-700 outline-none"
                      />
                    </label>
                  </div>
                </section>
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-200 bg-white px-5 py-4 md:px-6">
              <button
                type="button"
                onClick={() => {
                  if (salvando) return;
                  setAberto(false);
                }}
                className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={!podeSalvar}
                onClick={salvar}
                className="rounded-lg bg-[#07385a] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                {salvando ? "Salvando..." : "Cadastrar cliente"}
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
