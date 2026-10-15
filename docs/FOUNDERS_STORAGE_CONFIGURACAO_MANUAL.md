# Founders — configuração manual de Storage (Supabase)

Este guia é separado da migração SQL corretiva porque, em projetos Supabase gerenciados, o papel do SQL Editor pode não ser owner de `storage.objects`.

## 1) Verificar se o bucket existe

No SQL Editor (somente leitura):

```sql
select id, name, public, file_size_limit, allowed_mime_types
from storage.buckets
where id = 'founders-anexos';
```

## 2) Criar/ajustar bucket no painel (não via migração principal)

No painel Supabase:

1. **Storage → Buckets → New bucket**
2. Nome: `founders-anexos`
3. **Public bucket**: `OFF` (privado)
4. **File size limit**: `10485760` (10 MB)
5. **Allowed MIME types**:
   - `application/pdf`
   - `image/png`
   - `image/jpeg`
   - `image/webp`

Se o bucket já existir, apenas ajuste esses campos.

## 3) Políticas de acesso no painel (Storage → Policies)

Aplicar em `storage.objects` **somente para `bucket_id = 'founders-anexos'`**.

> Importante: para impedir troca de empresa por UPDATE, **não criar política de UPDATE** para usuários autenticados do produto.
> Assim, não há rename/move por UPDATE; upload novo usa INSERT e remoção usa DELETE com prefixo validado.

### Política SELECT (authenticated)

Permitir leitura para:
- admin Founders (`gc_founders_admin()`), ou
- empresa da própria sessão com participação ativa.

Expressão (USING):

```sql
bucket_id = 'founders-anexos'
and (
  public.gc_founders_admin()
  or (
    split_part(name, '/', 1) = public.gc_founders_empresa_id()::text
    and public.gc_founders_empresa_ativa()
  )
)
```

### Política INSERT (authenticated)

Expressão (WITH CHECK):

```sql
bucket_id = 'founders-anexos'
and split_part(name, '/', 1) = public.gc_founders_empresa_id()::text
and public.gc_founders_empresa_ativa()
and owner_id = auth.uid()
```

### Política DELETE (authenticated)

Expressão (USING):

```sql
bucket_id = 'founders-anexos'
and (
  public.gc_founders_admin()
  or (
    split_part(name, '/', 1) = public.gc_founders_empresa_id()::text
    and owner_id = auth.uid()
  )
)
```

### Política UPDATE

**Não criar** para usuários autenticados do ERP/Founders.

Com isso:
- não permite mover arquivo entre empresas por UPDATE;
- não permite substituir/renomear sem passar pelo fluxo controlado de delete+insert com validações.

## 4) Validação adicional no banco e fallback de backend

A função `gc_founders_anexar_contribuicao` (definida em `database/20261015_founders_correcao_seguranca.sql`) valida:

- existência do objeto em `storage.objects`;
- prefixo por empresa;
- MIME e tamanho com base em metadados reais do Storage.

Se o ambiente bloquear essa leitura por permissão (`insufficient_privilege`), a função falha em modo seguro com erro `42501`.

Nesse cenário, mantenha as policies acima e adicione validação no backend administrativo (service role) antes de chamar o RPC:

1. ler objeto no bucket `founders-anexos`;
2. comparar `name`, `mime_type` e `size` com o payload;
3. só então chamar `gc_founders_anexar_contribuicao`.

## 5) Validação rápida após configurar

1. Usuária da empresa A:
   - consegue listar apenas `A/*`;
   - não enxerga `B/*`.
2. Upload com prefixo errado:
   - deve falhar.
3. Tentativa de UPDATE em arquivo:
   - deve falhar (sem policy).
