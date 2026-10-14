const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),ts=require('typescript');
const api={};new Function('exports',ts.transpileModule(fs.readFileSync('src/utils/foraEsquadroLateral.ts','utf8'),{compilerOptions:{module:1,target:9}}).outputText)(api);
const d={larguraSuperior:3600,larguraInferior:3000,altura:1200,divisoes:3,lado:'direito'};
test('menor largura dividida igualmente e diferença somente na última peça',()=>{
 const p=api.calcularPecasLateral(d);
 assert.deepEqual(p.map(p=>p.larguraSuperior),[1000,1000,1600]);
 assert.deepEqual(p.map(p=>p.larguraInferior),[1000,1000,1000]);
 assert.ok(p.every(p=>p.alturaEsquerda===1200&&p.alturaDireita===1200));
});
test('lado esquerdo põe diferença na primeira peça; inverter larguras inverte inclinação',()=>{
 const p=api.calcularPecasLateral({...d,lado:'esquerdo',larguraSuperior:3000,larguraInferior:3600});
 assert.deepEqual(p.map(p=>p.larguraSuperior),[1000,1000,1000]);
 assert.deepEqual(p.map(p=>p.larguraInferior),[1600,1000,1000]);
});
test('divisões fracionárias preservam a soma real em cima e embaixo',()=>{
 const p=api.calcularPecasLateral({...d,divisoes:7,larguraInferior:3011});
 assert.ok(Math.abs(p.reduce((s,p)=>s+p.larguraSuperior,0)-3600)<1e-8);
 assert.ok(Math.abs(p.reduce((s,p)=>s+p.larguraInferior,0)-3011)<1e-8);
});
test('mesmas sobras e arredondamento da página original para cobrança',()=>{
 const p=api.calcularPecasLateral({...d,altura:1201,larguraInferior:3003,larguraSuperior:3603});
 assert.deepEqual(p.map(p=>[p.larguraCalculo,p.alturaCalculo]),[[1050,1300],[1050,1300],[1650,1300]]);
 const m=api.calcularPecasLateral(d,true);
 assert.deepEqual(m.map(p=>[p.larguraCalculo,p.alturaCalculo]),[[1100,1300],[1100,1300],[1700,1300]]);
 assert.ok(Math.abs(m.reduce((s,p)=>s+p.area,0)*100*1.3-659.1)<1e-8);
});
test('peça única e larguras iguais são válidas e têm divisões corretas',()=>{
 assert.equal(api.geometriaLateral({...d,divisoes:1}).cortes.length,0);
 assert.equal(api.geometriaLateral(d).cortes.length,2);
 assert.ok(api.calcularPecasLateral({...d,larguraSuperior:3000}).every(p=>p.queda===0));
});
test('desenho espelhado conserva cortes verticais e identifica larguras',()=>{
 const a=api.geometriaLateral(d),b=api.geometriaLateral({...d,lado:'esquerdo'});
 for(let i=0;i<a.cortes.length;i++)assert.ok(Math.abs(a.cortes[i]+b.cortes[i]-900)<1e-8);
 assert.match(decodeURIComponent(api.desenhoLateralUrl(d)),/Superior: 3600 mm/);
});
