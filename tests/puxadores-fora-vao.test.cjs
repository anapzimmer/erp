const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const ts=require('typescript');
const mod={exports:{}};
new Function('exports',ts.transpileModule(fs.readFileSync('src/utils/codigoPuxador.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText)(mod.exports);
const {codigoPuxadorCompativel}=mod.exports;
test('código com acabamento e separadores, sem misturar modelos e furações',()=>{
 for(const codigo of ['PUXBC30','PUXBC30PT','PUXBC30-PT','puxbc30 bc'])assert.ok(codigoPuxadorCompativel(codigo,'PUXBC30'));
 for(const codigo of ['PUXBC300','PUXBC60PT','OUTROPUXBC30','PUXBC30XYZ9'])assert.equal(codigoPuxadorCompativel(codigo,'PUXBC30'),false);
});
for(const rota of ['pfv1f-kit','pfv1f-barra','pfv2f-kit','pfv2f-barra'])test(`${rota}: puxadores de 300/600/800, quantidades e total`,()=>{
 const p=`src/app/(calculos)/${rota}/page.tsx`,source=fs.readFileSync(p,'utf8');
 const ast=ts.createSourceFile(p,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
 const parts={};
 function visit(n){if(ts.isVariableDeclaration(n)&&['buscarFerragemPorCodigo','ferragensAutomaticas'].includes(n.name.getText(ast)))parts[n.name.getText(ast)]=n.initializer.arguments[0].getText(ast);ts.forEachChild(n,visit);}
 visit(ast);
 for(const tamanho of [300,600,800])for(const com of [true,false]){
 const catalogo=[{codigo:`PUXBC${tamanho/10}PT`,nome:'Puxador',cores:'Preto',preco:80}];
 const dados={quantidade:3,corKit:'Preto',puxador:com?'Com puxador':'Sem puxador',tamanhoPuxador:`${tamanho}mm`,trinco:'Sem trinco'};
 const context={dados,codigoPuxadorCompativel,normalizarTexto:v=>String(v||'').toLowerCase(),buscarFerragem:pred=>catalogo.find(f=>pred('',f))||null,descricaoTemCodigo:()=>false,criarMaterial:m=>m,montarDescricaoComCor:(c,n,cor)=>`${c} - ${n} | ${cor}`};
 const executar=code=>new Function(...Object.keys(context),'return ('+ts.transpileModule('const f='+code,{}).outputText.replace(/^const f\s*=|^var f\s*=/,'').replace(/;\s*$/,'')+');')(...Object.values(context));
 context.buscarFerragemPorCodigo=executar(parts.buscarFerragemPorCodigo);
 const materiais=executar(parts.ferragensAutomaticas)();
 assert.equal(materiais.length,com?1:0);
 if(com){const qtd=rota.includes('2f')?6:3;assert.equal(materiais[0].qtd,qtd);assert.equal(materiais[0].valorUnitario*qtd,80*qtd);}
 }
});
