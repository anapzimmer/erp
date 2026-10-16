# Glass Code Founders — contrato de API (etapa 2)

Endpoint preparado: [route.ts](../src/app/api/plataforma/founders/route.ts)

- Base: `GET/POST /api/plataforma/founders`
- Autenticação: `Authorization: Bearer <access_token>`
- Cache: `no-store`

## GET

## `?visao=minha-area`

- Público-alvo: empresa participante.
- Backend: `rpc(gc_founders_minha_area)`.

Resposta de sucesso (exemplo):

```json
{
  "empresa_id": "uuid",
  "parceiro": { "id": "uuid", "status": "ativo" },
  "saldo_pontos": 120,
  "contribuicoes": [],
  "votacoes_abertas": [],
  "beneficios": []
}
```

## `?visao=admin&busca=&pagina=`

- Público-alvo: admin Founders/proprietária.
- Backend: `rpc(gc_founders_admin_painel)`.

Resposta de sucesso (exemplo):

```json
{
  "resumo": {
    "parceiros_ativos": 10,
    "contribuicoes_abertas": 5,
    "votacoes_abertas": 2,
    "resgates_pendentes": 4
  },
  "parceiros": [],
  "contribuicoes": []
}
```

## POST

## Ações de empresa participante

### `enviar_contribuicao`

Payload:

```json
{
  "acao": "enviar_contribuicao",
  "titulo": "Texto",
  "descricao": "Texto",
  "categoria": "Texto",
  "idempotency_key": "opcional"
}
```

Backend: `rpc(gc_founders_criar_contribuicao)`

---

### `anexar_contribuicao`

Payload:

```json
{
  "acao": "anexar_contribuicao",
  "contribuicao_id": "uuid",
  "storage_bucket": "founders-anexos",
  "storage_path": "empresa_uuid/arquivo.ext",
  "nome_arquivo": "arquivo.ext",
  "mime_type": "application/pdf",
  "tamanho_bytes": 1024,
  "hash_arquivo": "opcional"
}
```

Backend: `rpc(gc_founders_anexar_contribuicao)`

---

### `votar`

Payload:

```json
{
  "acao": "votar",
  "votacao_id": "uuid",
  "voto": "favor"
}
```

Backend: `rpc(gc_founders_votar)`

---

### `resgatar_beneficio`

Payload:

```json
{
  "acao": "resgatar_beneficio",
  "beneficio_id": "uuid",
  "quantidade": 1,
  "idempotency_key": "chave-operacao"
}
```

Backend: `rpc(gc_founders_resgatar_beneficio)`

## Ações administrativas Founders

### `admin_definir_parceiro`

Backend: `rpc(gc_founders_admin_definir_parceiro)`

### `admin_ajustar_pontos`

Backend: `rpc(gc_founders_admin_ajustar_pontos)`

### `admin_atualizar_contribuicao`

Backend: `rpc(gc_founders_admin_atualizar_contribuicao)`

### Votações (exigem a migração `20261016_founders_votacoes_admin.sql`)

Sem a migração, as ações/visões abaixo respondem `503` com mensagem clara; o restante do Founders não é afetado.

- `admin_criar_votacao` — `{ contribuicao_id, titulo, descricao, abre_em?, encerra_em }` → `gc_founders_admin_criar_votacao`. Cria em rascunho.
- `admin_atualizar_votacao` — `{ votacao_id, titulo, descricao, abre_em?, encerra_em }` → `gc_founders_admin_atualizar_votacao` (somente rascunho).
- `admin_abrir_votacao` — `{ votacao_id }` → `gc_founders_admin_abrir_votacao`.
- `admin_encerrar_votacao` — `{ votacao_id, cancelar: boolean, motivo? }` → `gc_founders_admin_encerrar_votacao`.

- `admin_definir_parceiro` — o limite de empresas **ativas** é aplicado no banco (gatilho `founders_parceiros_capacidade_trg`, capacidade em `founders_config`, migração `20261017_founders_cadastro_parceiros.sql`); ao exceder, a API responde `400` com a mensagem do banco. Sem a migração, não há limite no banco.

GET (admin): `?visao=empresas-busca&busca=` (3 a 100 caracteres) → `gc_founders_admin_buscar_empresas`; retorna até 10 `{ id, nome, cnpj|null, participante }`. `cnpj` só existe se a coluna `public.empresas.cnpj` existir. Sem a migração: `503` com mensagem clara.

GET (admin): `?visao=votacoes-admin` (`gc_founders_admin_resultado_votacao`, com `descricao` lida por SELECT) e `?visao=votacoes-participantes&votacao_id=` (`gc_founders_admin_participantes_votacao`, sem a escolha de cada empresa).

GET (parceiro): `?visao=votacoes-resultados` (`gc_founders_resultados_votacoes`, somente votações finalizadas, resultado agregado).

## Regras de erro

- `401`: sessão ausente/expirada.
- `403`: sem permissão (`gc_founders_admin` ou empresa não ativa).
- `400`: validação de payload / regras de domínio (`22023`).
- `503`: função não instalada/indisponibilidade.

## Tipos TypeScript

Modelados em [founders.ts](../src/types/founders.ts).

Cliente utilitário preparado em [founders.ts](../src/lib/founders.ts).
