const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
const path='src/app/relatorios/centralimpressao/CentralImpressaoPDF.tsx';
const src=ts.createSourceFile(path,fs.readFileSync(path,'utf8'),99,true,ts.ScriptKind.TSX);
const nomes=['normalizarDescricaoMaterial','extrairVidroRelacao','detalhesVidroAtualizados'];
const texto=src.statements.filter(n=>ts.isVariableStatement(n)&&n.declarationList.declarations.some(d=>nomes.includes(d.name.getText(src)))).map(n=>n.getText(src)).join('\n');
const code=ts.transpileModule(texto,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
const resolver=new Function(code+';return detalhesVidroAtualizados;')();
test('OR151011: descrição 10mm prevalece sobre snapshot 08mm',()=>{
 const material={descricao:'VIDRO INCOLOR 10MM TEMPERADO',medida:'1980 x 865 mm',vidroDescricao:'INCOLOR - 08MM - TEMPERADO',valorUnitario:247.5,qtd:3.6};
 const antes=JSON.stringify(material),r=resolver(material);
 assert.equal(r.vidroDescricao,'INCOLOR 10MM TEMPERADO');
 assert.equal(r.medida,'1980 x 865 mm');
 assert.equal(JSON.stringify(material),antes);
});
test('descrição genérica preserva nome detalhado e medida separada',()=>{
 assert.equal(resolver({descricao:'VIDRO FIXO',medida:'1980 x 865 mm',vidroDescricao:'FUMÊ 08MM TEMPERADO'}).vidroDescricao,'FUMÊ 08MM TEMPERADO');
});
test('legado sem campos separados extrai medida e nome',()=>{
 assert.deepEqual(resolver({descricao:'VIDRO 1000x900 INCOLOR 10MM TEMPERADO'}),{medida:'1000 x 900 mm',vidroDescricao:'INCOLOR 10MM TEMPERADO'});
});
