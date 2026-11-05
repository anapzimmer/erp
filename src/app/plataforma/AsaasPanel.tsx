"use client";

import { useState, type FormEvent } from "react";
import { Link2, ShieldCheck } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

export default function AsaasPanel({ empresaId = "" }: { empresaId?: string }) {
  const [mensagem, setMensagem] = useState("");
  const [salvando, setSalvando] = useState(false);

  async function vincular(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (salvando) return;
    setSalvando(true);
    setMensagem("");
    const form = new FormData(event.currentTarget);
    try {
      const { data } = await supabase.auth.getSession();
      const response = await fetch("/api/asaas/vincular", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + (data.session?.access_token || ""),
        },
        body: JSON.stringify({
          empresa: form.get("empresa"),
          assinatura: form.get("assinatura"),
          plano: form.get("plano"),
        }),
      });
      const resposta = await response.json();
      setMensagem(resposta.erro || resposta.mensagem);
    } catch {
      setMensagem("Falha de comunicação. Tente novamente.");
    } finally {
      setSalvando(false);
    }
  }

  return (
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
          <section className="min-w-0 overflow-hidden rounded-2xl border border-border bg-surface" aria-labelledby="titulo-vinculo">
            <div className="border-b border-border px-5 py-5 sm:px-7">
              <h2 id="titulo-vinculo" className="flex items-center gap-2 text-base font-semibold"><Link2 size={18} aria-hidden="true" /> Vincular assinatura</h2>
              <p className="mt-2 text-sm text-text-secondary">Informe os dados da assinatura mensal criada no Asaas.</p>
            </div>
            <form onSubmit={vincular} className="p-5 sm:p-7" aria-busy={salvando}>
              <fieldset disabled={salvando} className="grid min-w-0 gap-6">
                <label className="block text-sm font-medium">
                  ID da empresa
                  <input defaultValue={empresaId} name="empresa" required className="gc-field mt-2 w-full" placeholder="Identificador da empresa no Glass Code" aria-describedby="ajuda-empresa" />
                  <span id="ajuda-empresa" className="mt-2 block text-xs font-normal leading-relaxed text-text-secondary">Ao abrir pela lista de empresas, este campo vem preenchido.</span>
                </label>
                <label className="block text-sm font-medium">
                  ID da assinatura no Asaas
                  <input name="assinatura" required pattern="sub_[A-Za-z0-9_]+" className="gc-field mt-2 w-full" placeholder="sub_..." aria-describedby="ajuda-assinatura" />
                  <span id="ajuda-assinatura" className="mt-2 block text-xs font-normal leading-relaxed text-text-secondary">Copie o identificador da assinatura no painel do Asaas.</span>
                </label>
                <label className="block text-sm font-medium">
                  Plano contratado
                  <select name="plano" className="gc-field mt-2 w-full">
                    <option value="essencial">Essencial</option>
                    <option value="profissional">Profissional</option>
                    <option value="completo">Completo</option>
                  </select>
                </label>
                <div className="border-t border-border pt-5">
                  <button disabled={salvando} className="gc-action gap-2 disabled:cursor-wait disabled:opacity-60">
                    <Link2 size={16} aria-hidden="true" />
                    {salvando ? "Conferindo assinatura…" : "Vincular assinatura"}
                  </button>
                </div>
              </fieldset>
              <div role="status" aria-live="polite" className="mt-4 text-sm leading-relaxed">
                {mensagem && <p className="rounded-lg border border-border bg-background p-3">{mensagem}</p>}
              </div>
            </form>
          </section>

          <aside className="rounded-2xl border border-border bg-surface p-6" aria-labelledby="titulo-como-funciona">
            <h2 id="titulo-como-funciona" className="text-base font-semibold">Como funciona</h2>
            <ol className="mt-5 space-y-5 text-sm leading-relaxed text-text-secondary">
              {[
                ["Crie no Asaas", "Cadastre a assinatura mensal no painel do Asaas."],
                ["Vincule à empresa", "Preencha os dados ao lado antes do primeiro pagamento."],
                ["Receba a confirmação", "O pagamento confirmado atualiza o acesso pelo vínculo da assinatura."],
              ].map(([titulo, descricao], index) => (
                <li key={titulo} className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-background text-xs font-semibold text-text-primary">{index + 1}</span>
                  <div><p className="font-medium text-text-primary">{titulo}</p><p className="mt-1">{descricao}</p></div>
                </li>
              ))}
            </ol>
            <div className="mt-6 flex gap-2 border-t border-border pt-5 text-xs leading-relaxed text-text-secondary">
              <ShieldCheck size={18} className="shrink-0" aria-hidden="true" />
              <p>Vincular não cria cobranças nem libera acesso sem pagamento.</p>
            </div>
          </aside>
        </div>
  );
}
