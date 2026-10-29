const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const ts=require('typescript');
const transpilar=s=>ts.transpileModule(s,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
const catalogo={};new Function('exports',transpilar(fs.readFileSync('src/utils/catalogo-cor.ts','utf8')))(catalogo);
const file='src/app/(calculos)/max/page.tsx';
const ast=ts.createSourceFile(file,fs.readFileSync(file,'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
const partes={};
function visit(n){if(ts.isVariableDeclaration(n)&&['codigoFerragemCompativel','buscarPerfilPorCodigo','normalizarTexto'].includes(n.name.getText(ast)))partes[n.name.getText(ast)]=n.initializer.getText(ast);ts.forEachChild(n,visit);}visit(ast);
function buscar(perfis,cor){
 const code=Object.entries(partes).map(([k,v])=>`const ${k}=${v};`).join('\n');
 return new Function('perfis','dados','useCallback',...Object.keys(catalogo),transpilar(code)+';return buscarPerfilPorCodigo;')(perfis,{corKit:cor},f=>f,...Object.values(catalogo));
}
test('Max-ar: mesma cor tem prioridade mesmo com brilhante primeiro no catálogo',()=>{
 for(const codigo of ['CT004','VT66','VT10','VT17','VT47']){
 const perfis=['Brilhante','Padrão','Preto','Branco','Fosco'].map((cores,i)=>({id:i,codigo,cores,preco:10+i}));
 for(const cor of ['Preto','Branco','Fosco','Brilhante'])assert.equal(buscar(perfis,cor)(codigo).cores,cor);
 }
});
test('não substitui acabamento ausente por brilhante; admite somente padrão',()=>{
 const brilhante={codigo:'CT004',cores:'Brilhante'};
 assert.equal(buscar([brilhante],'Preto')('CT004'),null);
 assert.equal(buscar([brilhante],'Escolher')('CT004'),null);
 const padrao={codigo:'CT004',cores:'Padrão'};
 assert.equal(buscar([brilhante,padrao],'Preto')('CT004'),padrao);
 assert.equal(buscar([{codigo:'VT66',cores:'Preto'}],'Preto')('CT004'),null);
});
