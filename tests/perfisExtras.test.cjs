const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

function carregar(arquivo) {
  const codigo = ts.transpileModule(fs.readFileSync(arquivo, 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS },
  }).outputText;
  const modulo = { exports: {} };
  new Function('require', 'module', 'exports', codigo)(
    nome => carregar(path.resolve(path.dirname(arquivo), `${nome}.ts`)), modulo, modulo.exports,
  );
  return modulo.exports;
}
const raiz = path.resolve(__dirname, '../src/utils');
const { atualizarPerfilExtra, atualizarPerfisExtras, descricaoSemMarcadorExtra } = carregar(`${raiz}/perfisExtras.ts`);
const { mesclarMateriaisAutomaticos } = carregar(`${raiz}/materiaisAutomaticos.ts`);
const { calcularBarrasPorCortes } = carregar(`${raiz}/barras.ts`);
const medidas = { altura: 2100, largura: 2000, quantidade: 1 };
const modelo = () => ({ id: 'extra', descricao: 'VT1 - TUBO | BRANCO [PERFIL EXTRA]', codigoPerfil: 'VT1', unidade: 'barra', qtd: 0, valorUnitario: 100, comprimentoBarra: 6000,
  perfilExtra: { perfilId: 'perfil1', referencia: 'altura', quantidadePorVao: 1, ajuste: 0, medidaManual: 1200 } });

test('altura acompanha o vão e multiplica peças pela quantidade de vãos', () => {
  const item = atualizarPerfilExtra(modelo(), medidas);
  assert.deepEqual(item.cortes, [2100]);
  const alterado = atualizarPerfilExtra(item, { ...medidas, altura: 2400, quantidade: 2 });
  assert.deepEqual(alterado.cortes, [2400, 2400]);
  assert.equal(alterado.qtd, 1);
});
test('largura com desconto e quantidade por vão', () => {
  const item = modelo(); item.perfilExtra = { ...item.perfilExtra, referencia: 'largura', ajuste: -50, quantidadePorVao: 2 };
  const resultado = atualizarPerfilExtra(item, { ...medidas, quantidade: 2 });
  assert.deepEqual(resultado.cortes, [1950, 1950, 1950, 1950]);
  assert.equal(resultado.qtd, 2);
});
test('medida manual permanece fixa ao mudar o vão', () => {
  const item = modelo(); item.perfilExtra.referencia = 'manual'; item.perfilExtra.ajuste = 30;
  assert.deepEqual(atualizarPerfilExtra(item, { ...medidas, altura: 3000 }).cortes, [1230]);
});
test('recalcular não duplica nem apaga o extra de mesmo código', () => {
  const extra = atualizarPerfilExtra(modelo(), medidas);
  const automatico = { ...extra, id: 'auto', perfilExtra: undefined, descricao: 'VT1 - TUBO | BRANCO', cortes: [2100, 2100] };
  const lista = mesclarMateriaisAutomaticos([extra], [automatico], ['VT1']);
  assert.equal(lista.filter(item => item.perfilExtra).length, 1);
  assert.equal(atualizarPerfisExtras(lista, medidas), lista);
  assert.equal(mesclarMateriaisAutomaticos(lista, [automatico], ['VT1']).length, 2);
});
test('cortes extras participam das barras junto com os automáticos', () => {
  const extra = atualizarPerfilExtra(modelo(), medidas);
  assert.equal(calcularBarrasPorCortes([1800, 1800, ...extra.cortes], 6000), 1);
  assert.equal(descricaoSemMarcadorExtra(extra.descricao), 'VT1 - TUBO | BRANCO');
});
test('rascunho preserva vínculo ao restaurar e permite remover só o extra', () => {
  const item = atualizarPerfilExtra(modelo(), medidas);
  const restaurado = JSON.parse(JSON.stringify([item]));
  const atualizados = atualizarPerfisExtras(restaurado, { ...medidas, altura: 2500 });
  assert.deepEqual(atualizados[0].cortes, [2500]);
  assert.deepEqual(atualizados.filter(i => i.id !== 'extra'), []);
});

test('central agrupa o extra com o perfil automático e preserva cores distintas', () => {
  const arquivo = path.resolve(__dirname, '../src/app/(projetos)/central-impressao/page.tsx');
  const codigo = ts.transpileModule(`${fs.readFileSync(arquivo, 'utf8')}\nexport { calcularOtimizacaoPerfis };`, {
    compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React },
  }).outputText;
  const modulo = { exports: {} };
  new Function('require', 'module', 'exports', codigo)(nome => nome === '@/utils/perfisExtras'
    ? { descricaoSemMarcadorExtra } : {}, modulo, modulo.exports);
  const extra = atualizarPerfilExtra(modelo(), medidas);
  const automatico = { ...extra, id: 'auto', perfilExtra: undefined, descricao: 'VT1 - TUBO | BRANCO', cortes: [1800, 1800], qtd: 1 };
  const resultado = modulo.exports.calcularOtimizacaoPerfis([{ projeto: 'PC4FCB-KIT', materiais: [automatico, extra] }]);
  assert.equal(resultado.length, 1);
  assert.equal(resultado[0].barras.length, 1);
  assert.equal(resultado[0].totalCortes, 3);
  assert.equal(resultado[0].valorOtimizado, 100);
  const preto = { ...extra, id: 'preto', descricao: extra.descricao.replace('BRANCO', 'PRETO') };
  assert.equal(modulo.exports.calcularOtimizacaoPerfis([{ projeto: 'PC4FCB-KIT', materiais: [automatico, preto] }]).length, 2);
});
