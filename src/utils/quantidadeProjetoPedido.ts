/** Avulsos antigos guardavam quantidade=1 para o conjunto, não para as peças. */
export function quantidadeProjetoPedido(projeto:Record<string,unknown>):unknown {
 const relacao=Array.isArray(projeto.vidrosAvulsos)&&projeto.vidrosAvulsos.length?projeto.vidrosAvulsos:null;
 if(!relacao)return projeto.quantidade;
 const quantidades=relacao.map(item=>item&&typeof item==="object"?Number(item.quantidade??item.qtd):NaN);
 return quantidades.every(q=>Number.isFinite(q)&&q>=0)?quantidades.reduce((s,q)=>s+q,0):projeto.quantidade;
}
