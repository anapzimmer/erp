const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const compilar = source => ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
const api = {};
new Function('exports', compilar(fs.readFileSync('src/utils/parserTabelaVidrosPdf.ts', 'utf8')))(api);
const txt = 'TABELA CHAPECO - TABCH\nESP04LP   ESPELHO 04MM CEBRACE LAPIDA   217,80 0,00 ___________ ______\nINC04TE VIDRO INCOLOR 04MM TEMPERAD 1.124,30 0,00 ___________ ______';

test('relatório lê preço atual, preserva código e ignora mínimo/novo preço vazio', () => {
  const { produtos } = api.extrairProdutosTabelaTextoComDiagnostico(txt);
  assert.equal(produtos.length, 2);
  assert.equal(produtos[0].codigo, 'ESP04LP');
  assert.equal(produtos[0].preco, 217.8);
  assert.equal(produtos[1].preco, 1124.3);
});

const pagina = fs.readFileSync('src/app/(admin)/admin/tabelas/page.tsx', 'utf8');
async function analisar(arquivo, catalogo, destino = { id: 'destino', nome: 'Minha tabela' }) {
  let revisao, aviso, escritas = 0;
  const query = dados => ({ select() { return this; }, eq() { return this; }, order() { return Promise.resolve({ data: dados }); }, then(resolve) { return Promise.resolve({ data: dados }).then(resolve); } });
  const contexto = {
    tabelaSelecionada: destino, empresaIdAtual: 'empresa',
    setModalAvisoAberto: value => { aviso = value; }, setCarregando() {},
    decodeCsvFile: async () => arquivo, descricaoVidroCompativel: () => false,
    supabase: { from: tabela => query(tabela === 'vidros' ? catalogo : [{ vidro_id: 'vidro', preco: 100 }]) },
    setImportacaoPendente: value => { revisao = value; },
    confirmarImportacao: () => { escritas++; }, arquivoTabelaRef: { current: null }, console: { error() {} },
  };
  const trecho = pagina.slice(pagina.indexOf('  const normalizarTexto'), pagina.indexOf('  const atualizarItemPendente'));
  const importar = new Function(...Object.keys(contexto), compilar(trecho) + ';return importarTabelaTxt;')(...Object.values(contexto));
  await importar({ name: 'tabela.txt' });
  return { revisao, aviso, escritas };
}
const vidro = { id: 'vidro', codigo: 'ESP04LP', nome: 'Espelho Cebrace', espessura: '04mm', tipo: 'Lapidado', preco: 200 };
test('código reconhece descrição truncada, usa destino escolhido e exige revisão', async () => {
  const { revisao, escritas } = await analisar(txt, [vidro]);
  assert.equal(revisao.tabelaId, 'destino');
  assert.equal(revisao.nomeTabela, 'Minha tabela');
  assert.equal(revisao.reconhecidos.length, 1);
  assert.equal(revisao.precosAnteriores.vidro, 100);
  assert.equal(revisao.pendentes[0].acao, 'ignorar');
  assert.equal(escritas, 0);
});
test('código ambíguo no catálogo exige decisão', async () => {
  const { revisao } = await analisar(txt, [vidro, { ...vidro, id: 'outro' }]);
  assert.equal(revisao.reconhecidos.length, 0);
  assert.equal(revisao.pendentes[0].acao, 'ignorar');
});
test('arquivo com código repetido é bloqueado', async () => {
  const { revisao, aviso } = await analisar(txt + '\n' + txt, [vidro]);
  assert.equal(revisao, undefined);
  assert.match(aviso.mensagem, /repetidos/);
});
test('sem destino não importa nem cria tabela', async () => {
  const { revisao, aviso, escritas } = await analisar(txt, [vidro], null);
  assert.equal(revisao, undefined);
  assert.match(aviso.mensagem, /Selecione/);
  assert.equal(escritas, 0);
});
