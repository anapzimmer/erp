export type ParcelaPrevista={valor:number;vencimento:string};
export function dividirParcelas(total:number,quantidade:number,primeiroVencimento:string):ParcelaPrevista[]{
 const centavos=Math.round(total*100);
 if(!Number.isFinite(total)||centavos<=0||!Number.isInteger(quantidade)||quantidade<1||quantidade>60||centavos<quantidade||!/^\d{4}-\d{2}-\d{2}$/.test(primeiroVencimento))return [];
 const [ano,mes,dia]=primeiroVencimento.split('-').map(Number);
 const data=new Date(Date.UTC(ano,mes-1,dia));if(data.toISOString().slice(0,10)!==primeiroVencimento)return [];
 return Array.from({length:quantidade},(_,i)=>{const ultimo=new Date(Date.UTC(ano,mes+i,0)).getUTCDate();return {valor:(Math.floor(centavos/quantidade)+(i<centavos%quantidade?1:0))/100,vencimento:new Date(Date.UTC(ano,mes-1+i,Math.min(dia,ultimo))).toISOString().slice(0,10)}});
}
export const hojeFinanceiro=()=>new Intl.DateTimeFormat('sv-SE',{timeZone:'America/Sao_Paulo'}).format(new Date());
