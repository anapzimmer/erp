const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const caminho = 'src/app/(projetos)/central-impressao/page.tsx';
const source = ts.createSourceFile(caminho, fs.readFileSync(caminho, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const compilar = texto => ts.transpileModule(texto, {compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
function declaracao(nome) {
  let resultado;
  function visitar(node) {
    if (ts.isVariableDeclaration(node) && node.name.getText(source) === nome) resultado = node;
    ts.forEachChild(node, visitar);
  }
  visitar(source);
  assert.ok(resultado, nome);
  return resultado;
}
const normalizarTexto = valor => String(valor || '').toLowerCase();
const ehMaterialDeVidro = new Function('normalizarTexto', compilar('const ehMaterialDeVidro = '+declaracao('ehMaterialDeVidro').initializer.getText(source))+';return ehMaterialDeVidro;')(normalizarTexto);
const trocarVidroDescricaoMaterial = new Function(compilar('const trocarVidroDescricaoMaterial = '+declaracao('trocarVidroDescricaoMaterial').initializer.getText(source))+';return trocarVidroDescricaoMaterial;')();
const transformar = new Function('item','novoVidro','precoVidroSelecionado','deveTrocarVidro','criarId','ehMaterialDeVidro','trocarVidroDescricaoMaterial',
  compilar('const resultado = '+declaracao('materiaisAtualizados').initializer.getText(source))+';return resultado;');
test('troca 08mm por 10mm atualiza o nome usado pelo PDF e preserva medidas e outros materiais', () => {
  const original = [
    {id:'1',qtd:2,unidade:'m2',descricao:'VIDRO 1000x1000 INCOLOR 08MM',medida:'1000x1000',vidroDescricao:'INCOLOR 08MM',valorUnitario:100},
    {id:'2',qtd:1,unidade:'m2',descricao:'VIDRO 500x1000 FUMÊ 08MM',medida:'500x1000',vidroDescricao:'FUMÊ 08MM',valorUnitario:120},
    {id:'3',qtd:3,unidade:'und',descricao:'FECHO',valorUnitario:20},
  ];
  const copia = JSON.stringify(original);
  const resultado = transformar({materiais:original},'INCOLOR 10MM',198,descricao=>descricao.includes('INCOLOR 08MM'),()=>crypto.randomUUID(),ehMaterialDeVidro,trocarVidroDescricaoMaterial);
  assert.equal(resultado[0].descricao,'VIDRO 1000X1000 INCOLOR 10MM');
  assert.equal(resultado[0].vidroDescricao,'INCOLOR 10MM');
  assert.equal(resultado[0].valorUnitario,198);
  assert.equal(resultado[0].medida,'1000x1000');
  assert.equal(resultado[0].qtd,2);
  assert.equal(resultado[1].vidroDescricao,'FUMÊ 08MM');
  assert.equal(resultado[1].valorUnitario,120);
  assert.equal(resultado[2].descricao,'FECHO');
  assert.equal(JSON.stringify(original),copia,'não altera orçamento original');
  const salvo=JSON.parse(JSON.stringify(resultado));
  assert.equal(salvo[0].vidroDescricao,'INCOLOR 10MM','nome permanece correto após salvar e reabrir');
});
test('materiais antigos sem nome separado passam a ter o vidro selecionado', () => {
  const resultado=transformar({materiais:[{id:'1',qtd:1,unidade:'m2',descricao:'VIDRO INCOLOR 08MM',valorUnitario:100}]},'INCOLOR 10MM',198,()=>true,()=> 'novo',ehMaterialDeVidro,trocarVidroDescricaoMaterial);
  assert.equal(resultado[0].vidroDescricao,'INCOLOR 10MM');
});
