export type ItemRevisao=Record<string,unknown>;
const texto=(v:unknown)=>String(v??"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/×/g,"x").replace(/\s+/g," ").trim();
function descricao(v:unknown){return String(v??"").replace(/^(kit|ferragem|perfil)\s*:\s*[A-Z0-9]+(?:[.-][A-Z0-9]+)*\s+-\s+/i,"$1: ")}
export function camposRevisao(i:ItemRevisao){return {descricao:descricao(i.vidro??i.descricao??i.nome??""),quantidade:i.qtd??i.quantidade??"",medida:i.medidaReal??i.medida??(i.largura&&i.altura?`${i.largura} x ${i.altura} mm`:""),calculo:i.medidaCalc??"",cor:i.corSelecionada??i.cor??i.corMaterial??i.corKit??"",observacao:i.observacaoMedida??i.observacao??""}}
const assinatura=(i:ItemRevisao)=>JSON.stringify(Object.values(camposRevisao(i)).map(texto));
export function diferencasItens(antes:ItemRevisao[],depois:ItemRevisao[]){
 const usados=new Set<number>(),pendentes:ItemRevisao[]=[];const resultado:{antes?:ItemRevisao;depois?:ItemRevisao;tipo:string}[]=[];
 // Consome ocorrências iguais primeiro: ordenação e IDs regenerados não são alterações.
 for(const a of antes){const j=depois.findIndex((b,k)=>!usados.has(k)&&assinatura(a)===assinatura(b));if(j>=0)usados.add(j);else pendentes.push(a)}
 for(const a of pendentes){let j=depois.findIndex((b,k)=>!usados.has(k)&&a.id!=null&&a.id===b.id);if(j<0)j=depois.findIndex((b,k)=>!usados.has(k)&&texto(camposRevisao(a).descricao)===texto(camposRevisao(b).descricao));if(j<0)resultado.push({antes:a,tipo:"Removido"});else{usados.add(j);resultado.push({antes:a,depois:depois[j],tipo:"Alterado"})}}
 depois.forEach((b,j)=>{if(!usados.has(j))resultado.push({depois:b,tipo:"Incluído"})});return resultado;
}
