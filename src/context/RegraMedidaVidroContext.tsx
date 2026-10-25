"use client";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabaseClient";
import { REGRA_MEDIDA_PADRAO, regraValida, type RegraMedidaVidro } from "@/utils/regraMedidaVidro";

const Context = createContext({ regra: REGRA_MEDIDA_PADRAO, salvar: async (_regra: RegraMedidaVidro) => {} });
export const useRegraMedidaVidro = () => useContext(Context);
export function RegraMedidaVidroProvider({ children }: { children: ReactNode }) {
  const { empresaId } = useAuth();
  const [estado, setEstado] = useState<{ empresa: string | null; regra: RegraMedidaVidro }>({ empresa: null, regra: REGRA_MEDIDA_PADRAO });
  const [erro, setErro] = useState(false);
  const [tentativa, setTentativa] = useState(0);
  useEffect(() => {
    let ativo = true;
    setErro(false);
    if (!empresaId) { setEstado({ empresa: null, regra: REGRA_MEDIDA_PADRAO }); return; }
    supabase.from("configuracao_medida_vidro").select("limite_mm,percentual").eq("empresa_id", empresaId).maybeSingle().then(({ data, error }) => {
      if (!ativo) return;
      // Durante a implantação, a ausência da migration mantém a regra padrão explícita.
      if (error && !["42P01", "PGRST205"].includes(error.code)) { setErro(true); return; }
      const regra = data ? { limite_mm: Number(data.limite_mm), percentual: Number(data.percentual) } : REGRA_MEDIDA_PADRAO;
      if (!regraValida(regra)) { setErro(true); return; }
      setEstado({ empresa: empresaId, regra });
    });
    return () => { ativo = false; };
  }, [empresaId, tentativa]);
  async function salvar(regra: RegraMedidaVidro) {
    if (!empresaId || !regraValida(regra)) throw new Error("Informe limite positivo e percentual entre 0 e 100.");
    const { error } = await supabase.from("configuracao_medida_vidro").upsert({ empresa_id: empresaId, ...regra });
    if (error) throw new Error("Não foi possível salvar. Confira as permissões e a instalação da configuração de medidas.");
    setEstado({ empresa: empresaId, regra });
  }
  if (empresaId && estado.empresa !== empresaId) return <div className="p-6 text-text-primary">{erro ? <>Não foi possível carregar as regras de preço. <button onClick={() => setTentativa(v => v + 1)}>Tentar novamente</button></> : "Carregando regras de cálculo…"}</div>;
  return <Context.Provider value={{ regra: estado.regra, salvar }}>{children}</Context.Provider>;
}
