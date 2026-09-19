// Execute com PGLITE_MODULE apontando para @electric-sql/pglite instalado fora da aplicação.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { PGlite } = require(process.env.PGLITE_MODULE || '@electric-sql/pglite');
const owner = '10000000-0000-4000-8000-000000000001';
const user = '10000000-0000-4000-8000-000000000002';
const company = '20000000-0000-4000-8000-000000000002';
const migration = fs.readFileSync(path.join(__dirname, '../database/painel_plataforma.sql'), 'utf8');

test('permissões reais do painel, bloqueio RLS, reativação e histórico', async () => {
  const db = new PGlite();
  try {
    await db.exec(`
      create role anon; create role authenticated;
      create schema auth;
      create table auth.users(id uuid primary key, email text, email_confirmed_at timestamptz, created_at timestamptz default now(), last_sign_in_at timestamptz);
      create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
      grant usage on schema auth to authenticated;
      create table public.empresas(id uuid primary key, nome text);
      create table public.perfis_usuarios(id uuid primary key references auth.users(id), empresa_id uuid references public.empresas(id));
      create table public.orcamentos(id integer primary key, empresa_id uuid references public.empresas(id));
      create table public.projeto_templates(id integer primary key, empresa_id uuid references public.empresas(id));
      create policy "Templates por empresa - select" on projeto_templates for select to public using (empresa_id = auth.uid());
      insert into auth.users(id,email,email_confirmed_at) values ('${owner}','engenheiraceo@gmail.com',now()),('${user}','cliente@example.com',now());
      insert into empresas values ('20000000-0000-4000-8000-000000000001','Glass Code'),('${company}','Empresa cliente');
      insert into perfis_usuarios values ('${owner}','20000000-0000-4000-8000-000000000001'),('${user}','${company}');
      insert into orcamentos values (1,'${company}');
      insert into projeto_templates values (1,'${company}'),(2,'20000000-0000-4000-8000-000000000001'),(3,null);
      alter table empresas enable row level security;
      alter table perfis_usuarios enable row level security;
      alter table orcamentos enable row level security;
      create policy empresa on empresas to authenticated using (true) with check (true);
      create policy perfil on perfis_usuarios to authenticated using (id=auth.uid()) with check (id=auth.uid());
      create policy orcamento on orcamentos to authenticated using (empresa_id in (select empresa_id from perfis_usuarios where id=auth.uid())) with check (empresa_id in (select empresa_id from perfis_usuarios where id=auth.uid()));
      grant select,insert,update,delete on all tables in schema public to authenticated;
    `);
    const templatesFix = fs.readFileSync(path.join(__dirname, '../database/projeto_templates_rls_fix.sql'), 'utf8');
    await db.exec(templatesFix);
    await db.exec(templatesFix);
    await db.exec(migration);
    // Instalação idempotente; o UID da proprietária não é recalculado por e-mail.
    await db.exec(migration);
    const login = async id => db.exec(`reset role; set role authenticated; select set_config('request.jwt.claim.sub','${id}',false);`);
    await login(user);
    assert.equal((await db.query('select public.gc_proprietaria() ok')).rows[0].ok, false);
    await assert.rejects(db.query('select public.gc_painel()'), /exclusivo/);
    await assert.rejects(db.query(`select public.gc_alterar_acesso('empresa','${company}',true,'teste')`), /exclusivo/);
    await assert.rejects(db.query('select * from glasscode_private.proprietaria'), /permission denied/);
    assert.equal((await db.query('select * from orcamentos')).rows.length, 1);
    assert.deepEqual((await db.query('select id from projeto_templates')).rows, [{ id: 1 }]);
    await assert.rejects(db.query(`insert into projeto_templates values (4,'${company}')`), /row-level security/);
    await login(owner);
    assert.deepEqual((await db.query('select id from projeto_templates')).rows, [{ id: 2 }]);
    const painel = (await db.query('select public.gc_painel() painel')).rows[0].painel;
    assert.equal(painel.resumo.empresas, 2);
    await assert.rejects(db.query(`select public.gc_alterar_acesso('usuario','${owner}',true,'teste')`), /protegida/);
    await assert.rejects(db.query(`select public.gc_alterar_acesso('empresa','20000000-0000-4000-8000-000000000001',true,'teste')`), /protegida/);
    await assert.rejects(db.query(`select public.gc_alterar_acesso('empresa','${company}',true,'')`), /motivo/);
    await db.query(`select public.gc_alterar_acesso('empresa','${company}',true,'Suspensão de teste')`);
    await login(user);
    assert.equal((await db.query('select public.gc_acesso_permitido() ok')).rows[0].ok, false);
    assert.equal((await db.query('select * from orcamentos')).rows.length, 0);
    assert.equal((await db.query('select * from projeto_templates')).rows.length, 0);
    await assert.rejects(db.query(`insert into orcamentos values (2,'${company}')`), /row-level security/);
    // Tentar trocar a empresa enquanto bloqueado não altera o vínculo.
    assert.equal((await db.query(`update perfis_usuarios set empresa_id='20000000-0000-4000-8000-000000000001' where id='${user}' returning id`)).rows.length, 0);
    await login(owner);
    await db.query(`select public.gc_alterar_acesso('empresa','${company}',false,'Acesso restabelecido')`);
    await db.query(`select public.gc_alterar_acesso('usuario','${user}',true,'Bloqueio individual')`);
    await login(user);
    assert.equal((await db.query('select public.gc_acesso_permitido() ok')).rows[0].ok, false);
    await login(owner);
    await db.query(`select public.gc_alterar_acesso('usuario','${user}',false,'Acesso individual restabelecido')`);
    const final = (await db.query('select public.gc_painel() painel')).rows[0].painel;
    assert.equal(final.historico.length, 4);
    assert.ok(final.historico.every(e => e.autor_id === owner));
    await login(user);
    assert.equal((await db.query('select * from orcamentos')).rows.length, 1);
    await db.exec('reset role; set role anon;');
    await assert.rejects(db.query('select public.gc_painel()'), /permission denied/);
  } finally { await db.close(); }
});
