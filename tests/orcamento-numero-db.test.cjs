const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {PGlite}=require('@electric-sql/pglite');
test('numeração inclui lixeira, outras empresas e reservas; não recicla exclusões',async()=>{
 const db=new PGlite();try{
 await db.exec(`create role anon;create role authenticated;create schema auth;create schema glasscode_private;
 create function auth.uid() returns uuid language sql as $$select '10000000-0000-0000-0000-000000000001'::uuid$$;
 create function public.gc_acesso_permitido() returns boolean language sql as $$select true$$;
 create function public.gc_teste_valido() returns boolean language sql as $$select true$$;
 create table public.perfis_usuarios(id uuid,empresa_id uuid);
 insert into public.perfis_usuarios values(auth.uid(),gen_random_uuid());
 create table public.orcamentos(numero_formatado text unique,gc_excluido_em timestamptz);
 insert into public.orcamentos values('OR'||to_char(now() at time zone 'America/Sao_Paulo','DDMM')||'08',now());
 alter table public.orcamentos enable row level security;
 grant select on public.orcamentos to authenticated;
 create policy ocultar on public.orcamentos for select to authenticated using(false);`);
 await db.exec(fs.readFileSync('database/20261109_orcamentos_numeracao_segura.sql','utf8'));
 await db.exec('set role authenticated');
 assert.equal((await db.query('select * from public.orcamentos')).rows.length,0);
 const reservar=async()=> (await db.query('select public.gc_reservar_numero_orcamento() as n')).rows[0].n;
 const primeiro=await reservar();assert.ok(primeiro.endsWith('09'));
 assert.ok((await reservar()).endsWith('10'));
 await db.exec('reset role;delete from public.orcamentos;set role authenticated');
 assert.ok((await reservar()).endsWith('11'));
 await db.exec('reset role');
 await db.query('insert into public.orcamentos values($1,null)',[primeiro.slice(0,6)+'100']);
 await db.exec('set role authenticated');assert.ok((await reservar()).endsWith('101'));
 await db.exec('set role anon');await assert.rejects(reservar(),/permission denied/);
 }finally{await db.close()}
});
