import { PanelsTopLeft } from "lucide-react";

export function TituloCalculoTecnico({ titulo }: { titulo: string }) {
  return <div className="gc-page-title"><div><span className="gc-eyebrow">PROJETOS &amp; CÁLCULOS / PROJETOS TÉCNICOS</span><h1>{titulo}</h1><p>Configuração e orçamento técnico</p></div><PanelsTopLeft size={23} strokeWidth={1.5} /></div>;
}

export function EtapaCalculoTecnico({ numero, titulo, descricao }: { numero: string; titulo: string; descricao: string }) {
  return <div className="gc-section-heading"><span className="gc-step">{numero}</span><div><h2>{titulo}</h2><p>{descricao}</p></div></div>;
}
