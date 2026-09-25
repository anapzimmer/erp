const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const {PGlite}=require(process.env.PGLITE_MODULE||'@electric-sql/pglite');
test('avisos isolam empresas e leitura individual preserva mensagens novas',async()=>{
 const db=new PGlite();try{
 const owner='10000000-0000-4000-8000-000000000001',a='10000000-0000-4000-8000-000000000002',b='10000000-0000-4000-8000-000000000003',c='10000000-0000-4000-8000-000000000004',ticket='20000000-0000-4000-8000-000000000001',empresa='30000000-0000-4000-8000-000000000001';
 await db.exec(`create role anon;create role authenticated;create schema auth;create schema glasscode_private;create table auth.users(id uuid primary key);
 create function auth.uid() returns uuid language sql as $$select nullif(current_setting('test.uid',true),'')::uuid$$;
 create function public.gc_proprietaria() returns boolean language sql as $$select auth.uid()='${owner}'::uuid$$;
 create table public.perfis_usuarios(id uuid,empresa_id uuid);
 create table public.suporte_chamados(id uuid primary key,usuario_id uuid,empresa_id uuid,titulo text,created_at timestamptz);
 create table public.suporte_mensagens(id serial primary key,chamado_id uuid,usuario_id uuid,autor_tipo text,created_at timestamptz);
 insert into auth.users values('${owner}'),('${a}'),('${b}'),('${c}');insert into perfis_usuarios values('${a}','${empresa}'),('${c}','${empresa}'),('${b}',null);
 insert into suporte_chamados values('${ticket}','${a}','${empresa}','Teste','2026-01-01');
 insert into suporte_mensagens(chamado_id,usuario_id,autor_tipo,created_at) values('${ticket}','${owner}','glass_code','2026-01-02');`);
 await db.exec(fs.readFileSync('database/suporte_notificacoes.sql','utf8'));
 const asUser=async id=>db.exec(`set role authenticated;set test.uid='${id}'`);
 const notices=async()=> (await db.query('select gc_suporte_notificacoes() r')).rows[0].r;
 await asUser(a);assert.equal((await notices()).total,1);
 await db.query('select gc_suporte_marcar_lido($1,$2)',[ticket,'2026-01-02']);assert.equal((await notices()).total,0);
 await asUser(c);assert.equal((await notices()).total,1);
 await asUser(b);assert.equal((await notices()).total,0);await assert.rejects(db.query('select gc_suporte_marcar_lido($1,$2)',[ticket,'2026-01-02']));
 await asUser(owner);assert.equal((await notices()).total,1);await db.query('select gc_suporte_marcar_lido($1,$2)',[ticket,'2026-01-02']);assert.equal((await notices()).total,0);
 await db.exec(`reset role;insert into suporte_mensagens(chamado_id,usuario_id,autor_tipo,created_at) values('${ticket}','${a}','cliente','2026-01-03'),('${ticket}','${owner}','glass_code','2026-01-04');`);
 await asUser(owner);assert.equal((await notices()).total,1);
 await asUser(a);await db.query('select gc_suporte_marcar_lido($1,$2)',[ticket,'2026-01-02']);assert.equal((await notices()).total,1);
 await assert.rejects(db.query("select gc_suporte_marcar_lido($1,now()+interval '1 day')",[ticket]));
 await db.exec("set test.uid=''");await assert.rejects(db.query('select gc_suporte_notificacoes()'));
 }finally{await db.close();}
});
