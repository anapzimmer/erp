import { Info } from "lucide-react";
import { avisosAcrescimoVidro, type PropsAvisoMedida } from "@/utils/avisosMedidaVidro";
export default function AvisoAcrescimoVidro(props: PropsAvisoMedida) {
  const avisos = avisosAcrescimoVidro(props);
  if (!avisos.length) return null;
  return <div role="status" className="my-2 flex items-start gap-2 text-xs leading-5 text-info">
    <Info size={14} className="mt-1 shrink-0" aria-hidden="true"/>
    <div>{avisos.map(aviso => <p key={aviso}>{aviso}</p>)}</div>
  </div>;
}
