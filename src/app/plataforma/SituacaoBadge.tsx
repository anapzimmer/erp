import { situacoes, type Situacao } from "@/lib/situacaoConta";
import s from "./plataforma.module.css";
export default function SituacaoBadge({ situacao, texto }: { situacao: Situacao; texto?: string }) {
  return <span className={s.situacaoBadge} data-situacao={situacao}><span aria-hidden="true" className={s.situacaoPonto}/>{texto || situacoes[situacao]}</span>;
}
