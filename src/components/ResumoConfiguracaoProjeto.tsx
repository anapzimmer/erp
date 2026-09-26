import { CheckCircle2, AlertTriangle } from "lucide-react";
type Material = { descricao: string; unidade: string; qtd: number; valorUnitario: number };
export default function ResumoConfiguracaoProjeto({ materiais }: { materiais: Material[] }) {
 const ativos=materiais.filter(m=>Number(m.qtd)>0);
 const kits=ativos.filter(m=>/kit/i.test(m.descricao));
 const perfis=ativos.filter(m=>/barra/i.test(m.unidade));
 const ferragens=ativos.filter(m=>/und|un$/i.test(m.unidade)&&!/kit/i.test(m.descricao));
 const preco=ativos.length>0&&ativos.every(m=>Number(m.valorUnitario)>0);
 const itens=[{titulo:'Kit',ok:kits.length>0,detalhe:kits.length?'Incluído nos materiais':'Conforme configuração'},{titulo:'Perfis',ok:perfis.length>0,detalhe:perfis.length?'Calculados conforme medidas':'Conforme configuração'},{titulo:'Ferragens',ok:ferragens.length>0,detalhe:ferragens.length?'Incluídas nos materiais':'Conforme configuração'},{titulo:preco?'Preços informados':'Conferir preços',ok:preco,detalhe:preco?'Conforme cadastro':'Verifique os materiais'}];
 return <div className="mt-5 grid gap-x-5 gap-y-3 border-t border-border pt-4 sm:grid-cols-2 xl:grid-cols-4">{itens.map(item=><div key={item.titulo} className="flex items-start gap-2">{item.ok?<CheckCircle2 size={14} className="mt-0.5 shrink-0 text-primary"/>:<AlertTriangle size={14} className="mt-0.5 shrink-0 text-warning"/>}<div><p className="text-xs text-text-primary">{item.titulo}</p><p className="mt-1 text-[10px] text-text-secondary">{item.detalhe}</p></div></div>)}</div>;
}
