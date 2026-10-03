const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
const codigo=ts.transpileModule(fs.readFileSync('src/components/LoteRapidoProjetos.tsx','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.React,target:ts.ScriptTarget.ES2020}}).outputText;
function preparar(confirmar=true, editar=false, falha=false){
 const refs=[], store=new Map(), navegacoes=[]; let chamadas=0, n=0;
 const chave='glasscode:central-impressao:composicao';
 store.set(chave,JSON.stringify([{id:'anterior',cliente:'Ana',loteId:editar?'lote-antigo':'outro'}]));
 const api={};
 const react={useState:inicial=>[typeof inicial==='function'?inicial():inicial,()=>{}],useRef:valor=>{const r={current:valor};refs.push(r);return r;},useEffect:()=>{},useCallback:fn=>fn};
 vm.runInNewContext(codigo,{exports:api,require:nome=>nome==='react'?react:nome==='lucide-react'?{}: {confirmarEnvioOrcamento:async itens=>{chamadas++;if(confirmar) itens.forEach(i=>i.obra='Obra Confirmada');return confirmar;}},crypto:{randomUUID:()=>String(++n)},console,window:{requestAnimationFrame:fn=>fn(),setTimeout,localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>{if(falha)throw Error('sem espaço');store.set(k,v);}}}});
 const lote=api.useLoteRapidoProjetos({centralLoteId:editar?'lote-antigo':null,returnTo:'/central-impressao',dados:{cliente:'Ana'},materiais:[{qtd:1,valorUnitario:10}],setDados:fn=>{refs[0].current=fn(refs[0].current);},montarItemCentral:(id,dados)=>({id:id||String(++n),cliente:dados.cliente}),onNavigate:url=>navegacoes.push(url)});
 lote.linhas.forEach(l=>{l.largura=1000;l.altura=2000;});
 return {lote,ler:()=>JSON.parse(store.get(chave)),navegacoes,chamadas:()=>chamadas};
}
test('lote novo confirma continuidade e preserva itens anteriores',async()=>{const h=preparar();await h.lote.enviar();assert.equal(h.chamadas(),1);assert.equal(h.ler().length,4);assert.equal(h.ler()[0].id,'anterior');assert.ok(h.ler().slice(1).every(i=>i.obra==='Obra Confirmada'));assert.equal(h.navegacoes.length,1);});
test('cancelamento não grava nem navega',async()=>{const h=preparar(false);await h.lote.enviar();assert.equal(h.ler().length,1);assert.equal(h.navegacoes.length,0);});
test('editar substitui lote sem iniciar outro atendimento',async()=>{const h=preparar(true,true);await h.lote.enviar();assert.equal(h.chamadas(),0);assert.equal(h.ler().length,3);assert.ok(h.ler().every(i=>i.loteId==='lote-antigo'));});
test('falha de armazenamento não navega',async()=>{const h=preparar(true,false,true);await h.lote.enviar();assert.equal(h.navegacoes.length,0);assert.equal(h.ler().length,1);});
