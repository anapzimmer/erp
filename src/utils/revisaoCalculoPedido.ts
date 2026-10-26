export const REVISAO_CALCULO_KEY="glasscode:revisao-pedido:";
export type RevisaoCalculo={token:string;empresaId:string;pedidoId:string;versao:number;indice:number;campo:string;original:Record<string,unknown>;resultado?:Record<string,unknown>};
export function lerRevisaoCalculo(token:string):RevisaoCalculo|null{try{return JSON.parse(sessionStorage.getItem(REVISAO_CALCULO_KEY+token)||"null")}catch{return null}}
export function concluirRevisaoCalculo(token:string,empresaId:string|null|undefined,item:unknown):boolean{
 const sessao=lerRevisaoCalculo(token);
 if(!sessao||!empresaId||sessao.empresaId!==empresaId){window.alert("A sessão de revisão expirou. Volte ao pedido e inicie novamente.");return false}
 sessionStorage.setItem(REVISAO_CALCULO_KEY+token,JSON.stringify({...sessao,resultado:item}));return true;
}
