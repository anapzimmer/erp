const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
function carregar(file) {
  const modulo = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  new Function('require','exports',code)(id => carregar(path.resolve(path.dirname(file),id+'.ts')),modulo.exports);
  return modulo.exports;
}
const { planejarConjuntosBox2: planejar } = carregar(path.resolve('src/utils/calculos-projetos/planejarConjuntosBox2.ts'));
const projeto = { empresaId:'empresa',pedidoId:'pedido',projetoId:'box',origemCampo:'documentoPdfCompleto',
  quantidade:2,largura:1400,altura:2800,trilho:'Até o teto',linhaFixoId:'fixo',linhaMovelId:'movel' };
const unidades = () => [1,2].flatMap(n => ['fixo','movel'].map(p => ({id:p+n,empresa_id:'empresa',pedido_id:'pedido',
  projeto_id:'box',origem_campo:'documentoPdfCompleto',origem_linha_id:p,numero_unidade:n,
  largura_original_mm:p==='fixo'?700:750,altura_original_mm:p==='fixo'?2745:2780,situacao:'pendente'})));

test('plano determinístico liga peças existentes por linha e ordinal, independente da ordem da API', () => {
  const u=unidades(); const antes=structuredClone(u);
  const plano=planejar(projeto,u);
  assert.deepEqual(plano,planejar(projeto,[...u].reverse()));
  assert.deepEqual(plano.map(c=>c.vinculos.map(v=>v.unidadeId)),[['fixo1','movel1'],['fixo2','movel2']]);
  assert.deepEqual(u,antes);
  assert.equal('id' in plano[0],false);
});

test('divergência histórica de medidas bloqueia proposta, sem sobrescrita', () => {
  const u=unidades();u[0].largura_original_mm=699;
  assert.throws(()=>planejar(projeto,u),/diverge/);
  assert.equal(u[0].largura_original_mm,699);
});

test('recusa ausência, duplicação, situação não pendente e origem ambígua', () => {
  assert.throws(()=>planejar(projeto,unidades().slice(1)),/Quantidade/);
  const duplicadas=unidades();duplicadas[1]=duplicadas[0];
  assert.throws(()=>planejar(projeto,duplicadas),/identidade/);
  for (const campo of ['situacao','origem_campo','origem_linha_id']) {
    const u=unidades();u[0][campo]='incompatível';
    assert.throws(()=>planejar(projeto,u));
  }
  const papelDuplicado=unidades();papelDuplicado[1]={...papelDuplicado[0],id:'outro'};
  assert.throws(()=>planejar(projeto,papelDuplicado),/duplicado/);
  assert.throws(()=>planejar({...projeto,quantidade:3.85},unidades()),/Quantidade/);
});

test('peças de outros pedidos, empresas e avulsos não entram nos conjuntos', () => {
  const u=unidades();
  const extras=[{...u[0],id:'outra-empresa',empresa_id:'outra'},
    {...u[0],id:'outro-pedido',pedido_id:'outro'},
    ...Array.from({length:17},(_,i)=>({...u[0],id:'avulso'+i,projeto_id:'avulsos'}))];
  assert.deepEqual(planejar(projeto,[...u,...extras]),planejar(projeto,u));
});

test('evidência consultada do pedido #2: dois conjuntos, 4 vínculos e 21 unidades intocadas', () => {
  // Evidência de leitura, não conexão com banco; não contém credenciais ou valores comerciais.
  const e=JSON.parse(fs.readFileSync('docs/conferencia-etapa-c-auditoria-api.json','utf8'));
  const p=e.projetosTecnicos.find(p=>p.origemRota==='/box2fls');
  const fixo=p.materiais.find(m=>m.descricao.startsWith('VIDRO FIXO '));
  const movel=p.materiais.find(m=>m.descricao.startsWith('VIDRO MOVEL '));
  const u=e.unidades.map(u=>({...u,empresa_id:e.pedido.empresa_id,pedido_id:e.pedido.id}));
  const antes=structuredClone(u);
  const plano=planejar({empresaId:e.pedido.empresa_id,pedidoId:e.pedido.id,projetoId:p.id,origemCampo:p.origem_campo,
    quantidade:p.quantidade,largura:p.largura,altura:p.altura,trilho:p.trilho,linhaFixoId:fixo.id,linhaMovelId:movel.id},u);
  assert.equal(u.length,25);assert.equal(plano.length,2);
  const vinculados=new Set(plano.flatMap(c=>c.vinculos.map(v=>v.unidadeId)));
  assert.equal(vinculados.size,4);
  assert.equal(u.filter(u=>!vinculados.has(u.id)).length,21);
  assert.deepEqual(u,antes);
});
