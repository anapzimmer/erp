const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
function carregar(arquivo) {
  const codigo = ts.transpileModule(fs.readFileSync(arquivo, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const m = { exports: {} };
  new Function('require', 'module', 'exports', codigo)(nome => carregar(nome.startsWith('@/') ? path.resolve('src', nome.slice(2) + '.ts') : path.resolve(path.dirname(arquivo), nome + '.ts')), m, m.exports);
  return m.exports;
}
const regra = carregar(path.resolve('src/utils/regraMedidaVidro.ts'));
const preservar = carregar(path.resolve('src/utils/preservarPrecosOrcamento.ts')).preservarPrecosOrcamento;

test('limite estrito nas duas dimensões; 7% uma única vez; regra configurável', () => {
  assert.equal(regra.aplicarAcrescimoPorMedida(100, 3210, 3210), 100);
  for (const [l,a] of [[3211,1000],[1000,3211],[4000,4000]]) assert.equal(regra.aplicarAcrescimoPorMedida(100,l,a),107);
  assert.equal(regra.aplicarAcrescimoPorMedida(100,3300,1000,{limite_mm:3600,percentual:12}),100);
  assert.equal(regra.aplicarAcrescimoPorMedida(100,4000,1000,{limite_mm:3210,percentual:0}),100);
});
test('edição mantém preço base e regra salva, cruzando o limite sem duplicar acréscimo', () => {
  const material=(l,reg=regra.REGRA_MEDIDA_PADRAO)=>({descricao:`VIDRO ${l}x1000 INCOLOR`,unidade:'m2',...regra.precoMaterialVidro(100,`${l}x1000`,reg)});
  const original=material(3200);
  const maior=preservar([original],[material(3300)],true)[0];
  assert.equal(maior.valorUnitario,107);
  const repetido=preservar([maior],[material(3300,{limite_mm:3000,percentual:20})],true)[0];
  assert.equal(repetido.valorUnitario,107);
  assert.equal(preservar([repetido],[material(3200)],true)[0].valorUnitario,100);
});
test('sacada considera peças divididas e aplica acréscimo somente no vidro', () => {
  const calc=carregar(path.resolve('src/utils/sacada-torre-calc.ts')).calcularSacadaTorre;
  const input={larguraVaoMm:6400,alturaVaoMm:1000,quantidadeVaos:1,quantidadeDivisoesLargura:2,quantidadeTorresPorVidro:1,precoVidroM2:100,torreCodigo:'T',precoTorreUnitario:50};
  const normal=calc(input),maior=calc({...input,larguraVaoMm:6500});
  assert.equal(normal.precoVidroM2,100);
  assert.equal(maior.precoVidroM2,107);
  assert.equal(normal.totalAcessorios,maior.totalAcessorios);
  assert.equal(maior.totalGeral,maior.totalVidro+maior.totalAcessorios+maior.totalPerfis);
});
test('espelho aplica no vidro e mantém jato/adesivo, snapshot e divisão do jogo', () => {
  const calc=carregar(path.resolve('src/utils/calculoEspelhos.ts')).calcularEspelho;
  const entrada={largura:3300,altura:1000,quantidade:1,precoVidroM2:100,acabamento:{id:1,nome:'LED',tipo_visual:'padrao',tipo_calculo:'m2',preco:20,preco_jato:30,preco_adesivo:40}};
  const c=calc(entrada),sem=calc({...entrada,regraMedidaVidro:{limite_mm:3210,percentual:0}});
  assert.equal(c.memoriaCalculo.valorVidro,353.1);
  assert.equal(c.memoriaCalculo.valorJato,sem.memoriaCalculo.valorJato);
  assert.equal(c.memoriaCalculo.valorAdesivo,sem.memoriaCalculo.valorAdesivo);
  assert.equal(c.memoriaCalculo.entrada.regraMedidaVidro.percentual,7);
  assert.equal(calc({...entrada,acabamento:{...entrada.acabamento,tipo_visual:'jogo'},divisoesLargura:2}).memoriaCalculo.valorVidro,330);
});
test('atualizar tabela preserva fator salvo no material', () => {
  const comparar=carregar(path.resolve('src/utils/atualizarPrecosOrcamento.ts')).compararPrecosOrcamento;
  const material={id:'m',descricao:'VIDRO 3300x1000 INCOLOR 08mm TEMPERADO',unidade:'m2',qtd:3.3,...regra.precoMaterialVidro(100,'3300x1000')};
  const linhas=comparar([{id:'p',materiais:[material]}],[],[{vidro:true,descricao:'Incolor 08mm Temperado',preco:200}]);
  assert.equal(linhas[0].atual,214);
});

test('migration local: RLS isola empresas e chapas rejeitam medidas inválidas', async () => {
  const { PGlite } = require('@electric-sql/pglite');
  const db = new PGlite();
  try {
    await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role; CREATE SCHEMA auth;
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('app.uid',true),'')::uuid $$;
      CREATE TABLE public.empresas(id uuid PRIMARY KEY);
      CREATE TABLE public.perfis_usuarios(id uuid PRIMARY KEY, empresa_id uuid);
      CREATE TABLE public.vidros(id uuid PRIMARY KEY, empresa_id uuid);
      GRANT USAGE ON SCHEMA auth TO authenticated; GRANT SELECT ON public.perfis_usuarios TO authenticated;
      INSERT INTO empresas VALUES ('00000000-0000-0000-0000-000000000001'),('00000000-0000-0000-0000-000000000002');
      INSERT INTO perfis_usuarios VALUES ('00000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000001');`);
    await db.exec(fs.readFileSync('database/20261024_regra_medida_vidro_chapas.sql','utf8'));
    await db.exec(`INSERT INTO configuracao_medida_vidro(empresa_id) SELECT id FROM empresas;
      INSERT INTO vidros(id,chapas) VALUES ('00000000-0000-0000-0000-000000000004','[{"largura_mm":3210,"altura_mm":2200},{"largura_mm":3600,"altura_mm":2200}]');`);
    await assert.rejects(db.exec(`UPDATE vidros SET chapas='[{"largura_mm":0,"altura_mm":2200}]'`));
    await db.exec(`SET ROLE authenticated; SELECT set_config('app.uid','00000000-0000-0000-0000-000000000003',false);`);
    assert.equal((await db.query('SELECT * FROM configuracao_medida_vidro')).rows.length,1);
    await assert.rejects(db.exec(`INSERT INTO configuracao_medida_vidro VALUES ('00000000-0000-0000-0000-000000000002',3210,7)`));
    await assert.rejects(db.exec('TRUNCATE configuracao_medida_vidro'));
  } finally { await db.close(); }
});
