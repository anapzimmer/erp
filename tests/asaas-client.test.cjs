const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');

function load(file, env, fetch, dependencies = {}) {
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const loadedModule = { exports: {} };
  new Function('module', 'exports', 'require', 'process', 'fetch', code)(
    loadedModule, loadedModule.exports, name => {
      if (name === 'server-only') return {};
      if (dependencies[name]) return dependencies[name];
      throw new Error(`Unexpected dependency: ${name}`);
    }, { env }, fetch,
  );
  return loadedModule.exports;
}

const clientPath = 'src/lib/asaas/client.ts';
test('Asaas blocks invalid environments and missing keys before any network call', async () => {
  for (const env of [{}, { ASAAS_API_KEY: 'fictional', ASAAS_AMBIENTE: 'invalid' }]) {
    let calls = 0;
    const api = load(clientPath, env, () => { calls++; throw Error('Unexpected network'); });
    await assert.rejects(api.asaasRequest('/customers'));
    assert.equal(calls, 0);
  }
});

test('Asaas uses sandbox, timeout and prevents redirects without automatic retries', async () => {
  let calls = 0;
  const api = load(clientPath, { ASAAS_API_KEY: 'fictional', ASAAS_AMBIENTE: 'sandbox' }, async (url, options) => {
    calls++;
    assert.equal(url, 'https://api-sandbox.asaas.com/v3/customers');
    assert.equal(options.redirect, 'error');
    assert.ok(options.signal instanceof AbortSignal);
    return new Response(JSON.stringify({ id: 'fictional' }));
  });
  assert.deepEqual(await api.asaasRequest('/customers'), { id: 'fictional' });
  assert.equal(calls, 1);
  await assert.rejects(api.asaasRequest('//external.example'));
  assert.equal(calls, 1);
});

test('Error categories never include API descriptions or secret text', () => {
  const api = load(clientPath, {}, () => { throw Error('Unexpected network'); });
  assert.equal(api.categoriaErroAsaas(new api.AsaasApiError(401, 'private-code', 'private-description')), 'ASAAS_HTTP_401');
  assert.equal(api.categoriaErroAsaas(new DOMException('private', 'TimeoutError')), 'TEMPO_ESGOTADO');
  assert.equal(api.categoriaErroAsaas(new Error('private')), 'ERRO_DESCONHECIDO');
});

test('Connection diagnostic reports failures as 503, invalid responses too', async () => {
  for (const fail of [true, false]) {
    const api = load(clientPath, {}, () => { throw Error('Unexpected network'); });
    const route = load('src/app/api/asaas/testar-conexao/route.ts', { NODE_ENV: 'development' }, null, {
      '@/lib/asaas/client': { ...api, asaasRequest: async () => {
        if (fail) throw new api.AsaasApiError(401, 'private', 'private');
        return { object: 'unexpected' };
      } },
    });
    const response = await route.GET();
    assert.equal(response.status, 503);
    assert.deepEqual(await response.json(), { conectado: false, diagnostico: fail ? 'ASAAS_HTTP_401' : 'RESPOSTA_INVALIDA' });
  }
});

test('Connection diagnostic is disabled in production', async () => {
  const route = load('src/app/api/asaas/testar-conexao/route.ts', { NODE_ENV: 'production' }, null, {
    '@/lib/asaas/client': { asaasRequest: () => { throw Error('Must not execute'); } },
  });
  assert.equal((await route.GET()).status, 404);
});

test('Production uses only GET on the production API and rejects sandbox keys', async () => {
  let calls=0;
  const api=load(clientPath,{ASAAS_AMBIENTE:'production',ASAAS_API_KEY:'fictional'},async(url,options)=>{
    calls++; assert.equal(url,'https://api.asaas.com/v3/subscriptions/sub_test');
    assert.equal(options.method,'GET'); assert.equal(options.body,undefined);
    return new Response('{"id":"sub_test"}');
  });
  await api.asaasRequest('/subscriptions/sub_test'); assert.equal(calls,1);
  const blocked=load(clientPath,{ASAAS_AMBIENTE:'production',ASAAS_API_KEY:'fictional_hmlg_key'},()=>{throw Error('Network forbidden');});
  await assert.rejects(blocked.asaasRequest('/customers'),/incompatível/);
});
