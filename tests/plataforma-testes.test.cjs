const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { PGlite } = require(process.env.PGLITE_MODULE || '@electric-sql/pglite');
const owner='10000000-0000-4000-8000-000000000001';
const user='10000000-0000-4000-8000-000000000002';
const empresa='20000000-0000-4000-8000-000000000002';
test('teste vence no banco, preserva isolamento e suspensões e permite renovação administrativa', async () => {
  const db=new PGlite();
  try {
    await db.exec(`
      create role anon; create role authenticated;
      create schema auth;
      create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz,created_at timestamptz default now(),last_sign_in_at timestamptz,raw_app_meta_data jsonb default '{}',raw_user_meta_data jsonb default '{}');
      create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
      grant usage on schema auth to authenticated;
      create table empresas(id uuid primary key,nome text);
      create table perfis_usuarios(id uuid primary key,empresa_id uuid);
      create table orcamentos(id integer,empresa_id uuid);
      insert into auth.users(id,email,email_confirmed_at) values ('${owner}','engenheiraceo@gmail.com',now()),('${user}','teste@example.com',now());
      insert into empresas values ('${empresa}','Teste');
      insert into perfis_usuarios values ('${user}','${empresa}');
      insert into orcamentos values (1,'${empresa}');
      alter table empresas enable row level security;
      alter table perfis_usuarios enable row level security;
      alter table orcamentos enable row level security;
      create policy empresa on empresas to authenticated using (true);
      create policy perfil on perfis_usuarios to authenticated using (id=auth.uid());
      create policy orcamento on orcamentos to authenticated using (empresa_id in(select empresa_id from perfis_usuarios where id=auth.uid()));
      grant select,insert on all tables in schema public to authenticated;
    `);
    for(const file of ['painel_plataforma.sql','painel_situacao_contas.sql','painel_testes.sql','painel_testes.sql','teste_automatico_novos_usuarios.sql','teste_automatico_novos_usuarios.sql']) {
      await db.exec(fs.readFileSync(path.join(__dirname,'../database',file),'utf8'));
    }
    const identity=async(id)=>db.exec(`reset role; select set_config('request.jwt.claim.sub','${id}',false); set role authenticated;`);
    const allowed=async()=> (await db.query('select gc_acesso_permitido() ok')).rows[0].ok;
    const setTrial=async(value)=>{
      await db.exec('reset role');
      await db.query(`update auth.users set raw_app_meta_data=jsonb_build_object('gc_teste',$1::jsonb) where id=$2`,[JSON.stringify(value),user]);
      await identity(user);
    };
    await identity(user);
    assert.equal(await allowed(),true,'usuário sem teste mantém comportamento');
    await setTrial({dias:5,expira_em:new Date(Date.now()+5*86400000).toISOString()});
    assert.equal(await allowed(),true);
    assert.equal((await db.query('select * from orcamentos')).rows.length,1);
    await assert.rejects(db.query('select gc_painel_testes()'),/exclusivo/i);
    await assert.rejects(db.query("update auth.users set raw_app_meta_data='{}'"),/permission denied/i);
    await setTrial({dias:5,expira_em:'2000-01-01T00:00:00Z'});
    assert.equal(await allowed(),false);
    assert.equal((await db.query('select * from orcamentos')).rows.length,0,'sessão já emitida perde leitura');
    await assert.rejects(db.query(`insert into orcamentos values(2,'${empresa}')`),/row-level security/i);
    assert.equal((await db.query('select gc_minha_situacao() s')).rows[0].s.permitido,false);
    assert.equal((await db.query('select gc_minha_situacao() s')).rows[0].s.motivo_bloqueio,'teste_expirado');
    for(const invalido of [{pendente:true},{expira_em:'infinity'},{expira_em:'inválido'},{}]) {
      await setTrial(invalido); assert.equal(await allowed(),false);
    }
    await setTrial({dias:5,expira_em:new Date(Date.now()+5*86400000).toISOString()});
    assert.equal(await allowed(),true,'renovação desbloqueia teste vencido');
    await identity(owner);
    await db.query(`select gc_alterar_acesso('empresa',$1,true,'Suspensão manual')`,[empresa]);
    const painel=(await db.query('select gc_painel_testes() p')).rows[0].p;
    assert.equal(painel.usuarios.find(u=>u.id===user).teste.dias,5);
    assert.ok(painel.historico.some(h=>h.motivo==='Período de teste atualizado'));
    await identity(user); assert.equal(await allowed(),false,'teste não contorna bloqueio da empresa');
    await identity(owner); assert.equal(await allowed(),true);
    await db.exec('reset role; set role anon');
    await assert.rejects(db.query('select gc_teste_valido()'),/permission denied/i);
    await db.exec(`reset role;
      alter table auth.users add column banned_until timestamptz;
      alter table auth.users add column updated_at timestamptz;
      insert into auth.users(id,email,raw_app_meta_data,banned_until) values
        ('b43d05af-cdd8-405e-9287-c0d427bc22df','testeessencial@glasscode.com.br','{"gc_teste":{"pendente":true,"dias":5}}',now()+interval '100 years');
    `);
    const ativar=fs.readFileSync(path.join(__dirname,'../database/ativar_teste_essencial.sql'),'utf8');
    await db.exec(ativar);
    const ativado=(await db.query("select banned_until, raw_app_meta_data->'gc_teste' teste from auth.users where email='testeessencial@glasscode.com.br'")).rows[0];
    assert.equal(ativado.banned_until,null);
    assert.equal(ativado.teste.pendente,undefined);
    assert.equal(Date.parse(ativado.teste.expira_em)-Date.parse(ativado.teste.inicio_em),5*86400000);
    await db.exec(ativar);
    assert.deepEqual((await db.query("select raw_app_meta_data->'gc_teste' teste from auth.users where email='testeessencial@glasscode.com.br'")).rows[0].teste,ativado.teste,'reexecutar não estende o prazo');
    const migrationTresDias=fs.readFileSync(path.join(__dirname,'../database/20261022_teste_gratuito_3_dias.sql'),'utf8');
    await db.exec(migrationTresDias);
    // Mesmo cenário informado de produção: validador presente, iniciador ausente.
    await db.exec('drop trigger gc_teste_novo_cadastro on auth.users; drop function gc_iniciar_teste_cadastro();');
    await db.exec(migrationTresDias);
    await db.exec(migrationTresDias);
    assert.deepEqual((await db.query("select raw_app_meta_data->'gc_teste' teste from auth.users where email='testeessencial@glasscode.com.br'")).rows[0].teste,ativado.teste,'novo padrão preserva prazo anterior');
    const novo='10000000-0000-4000-8000-000000000003';
    await db.query(`insert into auth.users(id,email,raw_app_meta_data,raw_user_meta_data) values ($1,'novo@example.com','{"provider":"email"}','{"gc_teste":{"expira_em":"2099-01-01","dias":99999}}')`,[novo]);
    const metadata=(await db.query('select raw_app_meta_data m from auth.users where id=$1',[novo])).rows[0].m;
    assert.equal(metadata.provider,'email');
    assert.equal(metadata.gc_teste.dias,3,'cadastro não escolhe prazo via user_metadata');
    assert.equal(Date.parse(metadata.gc_teste.expira_em)-Date.parse(metadata.gc_teste.inicio_em),72*3600000);
    await identity(novo);
    assert.equal(await allowed(),true,'novo cadastro entra automaticamente');
    await db.exec('reset role');
    await db.query("update auth.users set raw_app_meta_data=jsonb_set(raw_app_meta_data,'{gc_teste,expira_em}',to_jsonb(now())) where id=$1",[novo]);
    await identity(novo);
    assert.equal(await allowed(),false,'bloqueia no instante exato do vencimento');
    const vencido=(await db.query('select gc_minha_situacao() s')).rows[0].s;
    assert.equal(vencido.motivo_bloqueio,'teste_expirado');
    assert.match(vencido.mensagem,/prazo de teste expirou/);
    await db.exec('reset role');
    await db.query("insert into auth.users(id,email,raw_app_meta_data) values ('10000000-0000-4000-8000-000000000004','nulo@example.com',null)");
    assert.equal((await db.query("select raw_app_meta_data->'gc_teste'->>'dias' dias from auth.users where email='nulo@example.com'")).rows[0].dias,'3');
  } finally { await db.close(); }
});
