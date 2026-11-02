
-- GLASS CODE
-- Integracao Asaas - Etapa 1
-- Estrutura inicial de assinaturas, pagamentos e eventos

create table if not exists glasscode_private.asaas_assinaturas (
    id uuid primary key default gen_random_uuid(),
    empresa_id uuid not null unique
        references public.empresas(id) on delete restrict,
    asaas_cliente_id text unique,
    asaas_assinatura_id text unique,
    plano text not null
        check (plano in ('essencial', 'profissional', 'completo')),
    valor_centavos bigint not null check (valor_centavos > 0),
    status text not null default 'pendente'
        check (status in (
            'pendente', 'ativa', 'inadimplente',
            'suspensa', 'cancelada'
        )),
    modalidade text
        check (modalidade in ('PIX', 'CREDIT_CARD')),
    acesso_pago_ate timestamptz,
    criada_em timestamptz not null default now(),
    atualizada_em timestamptz not null default now()
);

create table if not exists glasscode_private.asaas_pagamentos (
    id uuid primary key default gen_random_uuid(),
    empresa_id uuid not null
        references public.empresas(id) on delete restrict,
    assinatura_id uuid
        references glasscode_private.asaas_assinaturas(id)
        on delete restrict,
    asaas_pagamento_id text not null unique,
    valor_centavos bigint not null check (valor_centavos > 0),
    vencimento date,
    status text not null default 'pendente'
        check (status in (
            'pendente', 'confirmado', 'recebido',
            'vencido', 'estornado', 'cancelado'
        )),
    confirmado_em timestamptz,
    criado_em timestamptz not null default now(),
    atualizado_em timestamptz not null default now()
);

create index if not exists idx_asaas_pagamentos_empresa
    on glasscode_private.asaas_pagamentos(empresa_id);

create index if not exists idx_asaas_pagamentos_assinatura
    on glasscode_private.asaas_pagamentos(assinatura_id);

create table if not exists glasscode_private.asaas_eventos (
    id bigint generated always as identity primary key,
    asaas_evento_id text not null unique,
    tipo text not null,
    asaas_pagamento_id text,
    payload jsonb not null,
    recebido_em timestamptz not null default now(),
    processado_em timestamptz,
    erro text
);

-- Impedir acesso direto do navegador às tabelas

revoke all on glasscode_private.asaas_assinaturas
    from public, anon, authenticated;

revoke all on glasscode_private.asaas_pagamentos
    from public, anon, authenticated;

revoke all on glasscode_private.asaas_eventos
    from public, anon, authenticated;

revoke all on sequence glasscode_private.asaas_eventos_id_seq
    from public, anon, authenticated;

alter table glasscode_private.asaas_assinaturas
    enable row level security;

alter table glasscode_private.asaas_pagamentos
    enable row level security;

alter table glasscode_private.asaas_eventos
    enable row level security;
