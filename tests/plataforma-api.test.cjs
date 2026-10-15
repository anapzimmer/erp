const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const path = require('node:path');

function route({ owner = false, invalid = false, missing = false, usuarios = [], resendError = null, serviceKey = false, trialMissing = false, metadata = {} } = {}) {
  const chamadas = [];
  const db = {
    auth: {
      admin: {
        getUserById: async id => ({data:{user:{id,app_metadata:metadata}},error:null}),
        updateUserById: async (id,args) => { chamadas.push({name:'updateUserById',id,args}); return {error:null}; },
      },
      resend: async args => { chamadas.push({name:'resend',args}); return {error:resendError}; }, getUser: async () => ({ data: { user: invalid ? null : { id: 'verified-user' } }, error: invalid ? { message: 'invalid' } : null }) },
    rpc: async (name, args) => {
      chamadas.push({ name, args });
      if (name === 'gc_proprietaria') return { data: owner, error: missing ? { code: 'PGRST202' } : null };
      if (name === 'gc_painel') return { data: { usuarios }, error: null };
      if (name === 'gc_painel_testes') return { data: { usuarios }, error: trialMissing ? {code:'PGRST202'} : null };
      return { data: { success: true }, error: null };
    },
  };
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src/app/api/plataforma/route.ts'), 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS } }).outputText;
  vm.runInNewContext(code, { exports, require: () => ({ createClient: () => db }), Response, URL, process: { env: { NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co', NEXT_PUBLIC_SUPABASE_ANON_KEY: 'public-test-key', ...(serviceKey ? { SUPABASE_SERVICE_ROLE_KEY: 'test-only' } : {}) } } });
  return { ...exports, chamadas };
}
const req = (body, token = true) => new Request('http://localhost/api/plataforma', {
  method: body === undefined ? 'GET' : 'POST', headers: token ? { Authorization: 'Bearer test' } : {},
  ...(body === undefined ? {} : { body: JSON.stringify(body) }),
});

test('teste e senha exigem proprietária, alvo correto e proteção ativa no banco', async () => {
  const usuario={id:'10000000-0000-4000-8000-000000000002',email:'teste@example.com',protegida:false};
  const body={acao:'teste_usuario',alvo:usuario.id,email:usuario.email,dias:5};
  const options={owner:true,usuarios:[usuario],serviceKey:true};
  for (const acao of ['teste_usuario','senha_usuario']) {
    const tenant=route({...options,owner:false});
    assert.equal((await tenant.POST(req({...body,acao,senha:'Teste2026!'}))).status,403);
    assert.ok(!tenant.chamadas.some(c=>c.name==='updateUserById'));
    const protectedUser=route({...options,usuarios:[{...usuario,protegida:true}]});
    assert.equal((await protectedUser.POST(req({...body,acao,senha:'Teste2026!'}))).status,403);
    assert.ok(!protectedUser.chamadas.some(c=>c.name==='updateUserById'));
  }
  assert.equal((await route(options).POST(req({...body,alvo:'10000000-0000-4000-8000-000000000003'}))).status,404);
  const unavailable=route({...options,trialMissing:true});
  assert.equal((await unavailable.POST(req(body))).status,503);
  assert.ok(!unavailable.chamadas.some(c=>c.name==='updateUserById'));
  assert.equal((await route({...options,serviceKey:false}).POST(req(body))).status,503);
  for(const dias of [0,-1,366,1.5,'5',null]) assert.equal((await route(options).POST(req({...body,dias}))).status,400);
  const active=route({...options,metadata:{outro:'preservar',gc_teste:{pendente:true}}});
  const before=Date.now();
  const response=await active.POST(req(body));
  assert.equal(response.status,200);
  const result=await response.json();
  assert.equal(Date.parse(result.teste.expira_em)-Date.parse(result.teste.inicio_em),5*86400000);
  assert.ok(Date.parse(result.teste.inicio_em)>=before);
  const mutation=active.chamadas.find(c=>c.name==='updateUserById');
  assert.equal(mutation.args.app_metadata.outro,'preservar');
  assert.equal(mutation.args.ban_duration,'none');
  assert.equal(mutation.args.app_metadata.gc_teste.pendente,undefined);
  const password=route(options);
  assert.equal((await password.POST(req({...body,acao:'senha_usuario',senha:'Teste2026!'}))).status,200);
  assert.deepEqual(Object.keys(password.chamadas.find(c=>c.name==='updateUserById').args),['password']);
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

test('financeiro mantém autorização e aceita somente ações permitidas', async () => {
  const tenant = route();
  assert.equal((await tenant.POST(req({ acao: 'pagar', dados: { motivo: 'teste' } }))).status, 403);
  assert.ok(!tenant.chamadas.some(c => c.name === 'gc_financeiro_alterar'));
  const owner = route({ owner: true });
  assert.equal((await owner.POST(req({ acao: 'excluir', dados: {} }))).status, 400);
  assert.equal((await owner.POST(req({ acao: 'pagar', dados: [] }))).status, 400);
  assert.equal((await owner.POST(req({ acao: 'pagar', dados: { motivo: 'teste' } }))).status, 200);
  assert.equal(owner.chamadas.filter(c => c.name === 'gc_financeiro_alterar').length, 1);
  const request = new Request('http://localhost/api/plataforma?modo=financeiro', { headers: { Authorization: 'Bearer test' } });
  assert.equal((await owner.GET(request)).status, 200);
  assert.ok(owner.chamadas.some(c => c.name === 'gc_financeiro'));
});

test('situação exige proprietária e encaminha a operação validada pelo banco', async () => {
  const body={acao:'situacao',dados:{tipo:'empresa',alvo:'20000000-0000-4000-8000-000000000002',situacao:'regularizacao',categoria:'inadimplencia',motivo:'Conferência manual',mensagem:'Mensagem pública',contato:'',prazo:'2099-01-01'}};
  const tenant=route();
  assert.equal((await tenant.POST(req(body))).status,403);
  assert.ok(!tenant.chamadas.some(c=>c.name==='gc_definir_situacao'));
  const owner=route({owner:true});
  assert.equal((await owner.POST(req({...body,dados:[]}))).status,400);
  assert.equal((await owner.POST(req(body))).status,200);
  assert.equal(owner.chamadas.filter(c=>c.name==='gc_definir_situacao').length,1);
});

test('reenvio exige proprietária, cadastro correspondente e confirmação pendente', async () => {
  const usuario = {id:'user-1',email:'teste@example.com',confirmado:false};
  const body = {acao:'reenviar_confirmacao',alvo:usuario.id,email:usuario.email};
  const tenant = route({usuarios:[usuario]});
  assert.equal((await tenant.POST(req(body))).status,403);
  assert.ok(!tenant.chamadas.some(c=>c.name==='resend'));
  const owner=route({owner:true,usuarios:[usuario]});
  assert.equal((await owner.POST(req({...body,alvo:'outro'}))).status,404);
  assert.equal((await owner.POST(req({...body,email:'outro@example.com'}))).status,404);
  assert.equal((await owner.POST(req(body))).status,200);
  assert.equal(owner.chamadas.filter(c=>c.name==='resend').length,1);
  assert.equal(owner.chamadas.find(c=>c.name==='resend').args.type,'signup');
  const confirmed=route({owner:true,usuarios:[{...usuario,confirmado:true}]});
  assert.equal((await confirmed.POST(req(body))).status,409);
  assert.ok(!confirmed.chamadas.some(c=>c.name==='resend'));
  const limited=route({owner:true,usuarios:[usuario],resendError:{status:429}});
  assert.equal((await limited.POST(req(body))).status,429);
});
