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

## Regras de erro

- `401`: sessão ausente/expirada.
- `403`: sem permissão (`gc_founders_admin` ou empresa não ativa).
- `400`: validação de payload / regras de domínio (`22023`).
- `503`: função não instalada/indisponibilidade.

## Tipos TypeScript

Modelados em [founders.ts](../src/types/founders.ts).

Cliente utilitário preparado em [founders.ts](../src/lib/founders.ts).
