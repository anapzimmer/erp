const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const path = require('node:path');

function route({ owner = false, invalid = false, missing = false } = {}) {
  const chamadas = [];
  const db = {
    auth: { getUser: async () => ({ data: { user: invalid ? null : { id: 'verified-user' } }, error: invalid ? { message: 'invalid' } : null }) },
    rpc: async (name, args) => {
      chamadas.push({ name, args });
      if (name === 'gc_proprietaria') return { data: owner, error: missing ? { code: 'PGRST202' } : null };
      return { data: { success: true }, error: null };
    },
  };
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src/app/api/plataforma/route.ts'), 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS } }).outputText;
  vm.runInNewContext(code, { exports, require: () => ({ createClient: () => db }), Response, URL, process: { env: { NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co', NEXT_PUBLIC_SUPABASE_ANON_KEY: 'public-test-key' } } });
  return { ...exports, chamadas };
}
const req = (body, token = true) => new Request('http://localhost/api/plataforma', {
  method: body === undefined ? 'GET' : 'POST', headers: token ? { Authorization: 'Bearer test' } : {},
  ...(body === undefined ? {} : { body: JSON.stringify(body) }),
});

test('API exige sessão verificada e permissão do banco', async () => {
  const anonymous = route();
  assert.equal((await anonymous.GET(req(undefined, false))).status, 401);
  assert.equal(anonymous.chamadas.length, 0);
  const invalid = route({ invalid: true });
  assert.equal((await invalid.GET(req())).status, 401);
  const tenant = route();
  assert.equal((await tenant.GET(req())).status, 403);
  assert.deepEqual(tenant.chamadas.map(c => c.name), ['gc_proprietaria']);
  assert.equal((await route({ missing: true }).GET(req())).status, 503);
  const owner = route({ owner: true });
  const result = await owner.GET(req());
  assert.equal(result.status, 200);
  assert.equal(result.headers.get('cache-control'), 'no-store');
});

test('API não executa alterações sem permissão ou com dados inválidos', async () => {
  const body = { tipo: 'empresa', alvo: '20000000-0000-4000-8000-000000000002', bloqueado: true, motivo: 'Teste de bloqueio' };
  const tenant = route();
  assert.equal((await tenant.POST(req(body))).status, 403);
  assert.ok(!tenant.chamadas.some(c => c.name === 'gc_alterar_acesso'));
  const owner = route({ owner: true });
  assert.equal((await owner.POST(req({ ...body, motivo: '' }))).status, 400);
  assert.equal((await owner.POST(req({ ...body, bloqueado: 'true' }))).status, 400);
  assert.equal((await owner.POST(req(body))).status, 200);
  assert.equal(owner.chamadas.filter(c => c.name === 'gc_alterar_acesso').length, 1);
});
