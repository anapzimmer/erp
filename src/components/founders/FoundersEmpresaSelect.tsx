"use client";

import { useEffect, useRef, useState } from "react";
import { buscarEmpresasFounders, FoundersApiRequestError } from "@/lib/founders";
import type { FoundersEmpresaBusca } from "@/types/founders";

const uuidRegex =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Props = {
  empresaId: string;
  empresaNome: string;
  disabled?: boolean;
  onSelect: (empresa: { id: string; nome: string } | null) => void;
  onManualId: (id: string) => void;
};

export default function FoundersEmpresaSelect({
  empresaId,
  empresaNome,
  disabled,
  onSelect,
  onManualId,
}: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<FoundersEmpresaBusca[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);
  const [manual, setManual] = useState(false);
  const [manualValue, setManualValue] = useState("");
  const requestId = useRef(0);
  const termo = query.trim();

  useEffect(() => {
    const current = ++requestId.current;
    if (termo.length < 3) return;
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await buscarEmpresasFounders(termo);
        if (current !== requestId.current) return;
        setResults(Array.isArray(data) ? data : []);
        setError(null);
      } catch (err) {
        if (current !== requestId.current) return;
        setResults([]);
        setError(
          err instanceof FoundersApiRequestError || err instanceof Error
            ? err.message
            : "Não foi possível pesquisar empresas."
        );
      } finally {
        if (current === requestId.current) {
          setLoading(false);
          setSearched(true);
        }
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [termo]);

  return (
    <div className="grid gap-3 sm:col-span-2 lg:col-span-3">
      {empresaId ? (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border p-3">
          <div className="min-w-0">
            <p className="text-xs text-text-secondary">Empresa selecionada</p>
            <p className="truncate font-semibold text-text-primary">
              {empresaNome || "Empresa informada por UUID"}
            </p>
            <p className="break-all text-xs text-text-secondary">{empresaId}</p>
          </div>
          <button
            className="gc-action gc-secondary"
            disabled={disabled}
            onClick={() => {
              onSelect(null);
              setQuery("");
            }}
            type="button"
          >
            Trocar empresa
          </button>
        </div>
      ) : (
        <div className="grid gap-2">
          <label className="grid gap-1 text-sm text-text-secondary">
            Pesquisar empresa por nome{manual ? "" : " ou CNPJ"}
            <input
              autoComplete="off"
              className="gc-field"
              disabled={disabled}
              maxLength={100}
              onChange={(event) => {
                const value = event.target.value;
                setQuery(value);
                if (value.trim().length < 3) {
                  setResults([]);
                  setSearched(false);
                  setError(null);
                  setLoading(false);
                }
              }}
              placeholder="Digite ao menos 3 caracteres"
              value={query}
            />
          </label>
          {loading && <p className="text-xs text-text-secondary">Pesquisando...</p>}
          {error && (
            <p className="text-sm text-warning" role="alert">
              {error}
            </p>
          )}
          {!loading && !error && searched && results.length === 0 && (
            <p className="text-sm text-text-secondary">Nenhuma empresa encontrada.</p>
          )}
          {results.length > 0 && (
            <ul className="grid gap-1 rounded-xl border border-border p-1" role="listbox">
              {results.map((empresa) => (
                <li key={empresa.id}>
                  <button
                    className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm hover:bg-white/5"
                    onClick={() => {
                      onSelect({ id: empresa.id, nome: empresa.nome });
                      setResults([]);
                    }}
                    role="option"
                    aria-selected={false}
                    type="button"
                  >
                    <span className="min-w-0 truncate text-text-primary">
                      {empresa.nome}
                      {empresa.cnpj ? (
                        <span className="ml-2 text-xs text-text-secondary">{empresa.cnpj}</span>
                      ) : null}
                    </span>
                    {empresa.participante && (
                      <span className="shrink-0 text-xs text-text-secondary">
                        Já participa
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      {!empresaId && (
        <div className="grid gap-2">
          <button
            className="w-fit text-xs text-text-secondary underline"
            onClick={() => setManual((current) => !current)}
            type="button"
          >
            {manual ? "Ocultar UUID manual" : "Informar UUID manualmente (alternativa administrativa)"}
          </button>
          {manual && (
            <div className="grid gap-1 text-sm text-text-secondary">
              <label htmlFor="founders-uuid-manual">UUID da empresa</label>
              <div className="flex gap-2">
                <input
                  className="gc-field min-w-0 flex-1"
                  disabled={disabled}
                  id="founders-uuid-manual"
                  onChange={(event) => setManualValue(event.target.value)}
                  placeholder="00000000-0000-0000-0000-000000000000"
                  value={manualValue}
                />
                <button
                  className="gc-action gc-secondary"
                  disabled={disabled || !uuidRegex.test(manualValue.trim())}
                  onClick={() => {
                    onManualId(manualValue.trim());
                    setManualValue("");
                  }}
                  type="button"
                >
                  Usar UUID
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
