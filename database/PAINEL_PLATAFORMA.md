# Ativação do painel Glass Code

## Situações da conta e comunicação de suspensão

Execute `database/painel_situacao_contas.sql` depois das atualizações anteriores. Em Empresas ou Usuários, escolha **Gerenciar situação**. Estão disponíveis: ativa, pagamento pendente, prazo de regularização, suspensa por inadimplência, suspensa por outro motivo e cancelada.

O motivo padronizado é separado da observação interna obrigatória e da mensagem pública. O canal de atendimento é opcional e deve ser preenchido com um contato real. A prévia mostra o texto que o cliente verá; não envia e-mail, WhatsApp ou boleto. A data de início é registrada ao mudar a situação. O motivo, o autor e os dados anteriores/posteriores ficam no histórico privado.

Pendência e regularização mantêm acesso, com aviso no sistema. Mesmo após vencer o prazo, a suspensão depende de decisão manual da proprietária. Suspensão e cancelamento bloqueiam por RLS, preservando os registros. Uma restrição da empresa não é anulada ao liberar um usuário, e vice-versa. A conta/empresa da proprietária continuam protegidas. A tela de suspensão permite consultar a situação novamente e mostra o canal de atendimento informado. As sessões existentes verificam a situação a cada 15 segundos com a aba visível; o banco aplica o bloqueio a cada operação.

`gc_minha_situacao()` aceita somente a própria sessão, retorna apenas os campos públicos e nunca retorna a observação interna. Não há integração entre baixa financeira e reativação automática nesta versão. A atualização mantém compatibilidade com os comandos anteriores de bloquear/liberar. Caso reinstale o SQL base do painel, reaplique esta atualização depois dele.

## Histórico de login e saída

Execute `database/painel_historico_acessos.sql` e atualize o painel. **Histórico de acessos** consulta eventos `login`, `logout` e `mfa_code_login` de `auth.audit_log_entries`, com busca e paginação. **Bloqueios e liberações** preserva a auditoria administrativa anterior. O histórico atualiza a cada 30 segundos quando a aba está visível.

No Supabase, **Authentication → Configuration → Audit Logs → Write audit logs to the database** controla a gravação desses eventos no banco. Se não houver registros, o painel mostra `auth.users.last_sign_in_at` como **Último login conhecido**, sem inventar entradas antigas. Ativar a gravação não recupera automaticamente eventos antigos ausentes. Sessões persistentes não são novos logins e esta tela não indica quem está online. Os registros de login da auditoria são eventos de autenticação, não uma confirmação de que o acesso ao ERP não estava suspenso.

A função consulta somente os campos necessários e exige o UID da proprietária. Não acrescenta triggers nem altera o fluxo de login. Referência: https://supabase.com/docs/guides/auth/audit-logs

## Atualização: gestão financeira interna

Com o painel já instalado, execute somente `database/painel_financeiro.sql` no SQL Editor e atualize `/plataforma`. Em **Financeiro → Planos por empresa**, configure nome do plano, mensalidade, vencimento (1 a 28) e e-mail financeiro opcional. Use **Lançar mês** para criar uma mensalidade por empresa e competência. Não há geração recorrente automática nesta versão.

Em **Cobranças**, registre o pagamento após conferir o recebimento, cancele ou reabra com motivo. O financeiro calcula atrasos pelo vencimento e pelo horário de São Paulo; não bloqueia acesso automaticamente. Alterar um plano não muda cobranças antigas. Valores são armazenados em centavos, e o histórico guarda autor, motivo e dados anteriores/posteriores na mesma transação.

**Não emite boletos, não envia mensagens, não consulta bancos e não confirma pagamentos automaticamente.** A usuária informou que ainda não utiliza provedor. Esses recursos dependem da escolha e configuração de um serviço de pagamentos, com autenticação de webhooks, idempotência e conciliação. Todas as baixas atuais são manuais e identificadas na interface. Nenhum cliente real foi cobrado nos testes.

Os testes locais cobrem permissões, geração duplicada, estabilidade de valores após mudança de plano, pagamento com data futura, pagamento repetido, reabertura, cancelamento e histórico.

Para o diagnóstico de 19/09/2026 (oito tabelas sem RLS), execute primeiro `database/painel_rls_pendencias.sql`. Ele isola tipologias e componentes por empresa, permite somente leitura do próprio registro em `usuarios` e fecha o acesso pela API a `ferragens_cores`, `materiais` e `medidas`, que não têm vínculo de empresa nem uso encontrado no código atual. Os registros permanecem no banco. A titularidade e possíveis integrações dessas três tabelas devem ser definidas antes de conceder acesso. Em seguida execute `painel_plataforma.sql`.

1. No Supabase Authentication, confira que `engenheiraceo@gmail.com` é sua conta e tem e-mail confirmado.
2. Execute `database/painel_plataforma.sql` no SQL Editor como `postgres`. Tudo é aplicado em uma transação. Se houver erro, nenhuma parte da instalação é mantida.
3. Entre nessa conta no ERP. No menu do usuário, abra **Painel Glass Code**, ou acesse `/plataforma`.
4. Valide com uma empresa de teste: bloquear, confirmar que ela não lê/grava dados, liberar e conferir o histórico.

Se a instalação indicar RLS desativado em `projeto_templates`, execute primeiro `database/projeto_templates_rls_fix.sql` e repita a instalação. Essa correção substitui a política antiga que comparava empresa com usuário pela consulta do vínculo em `perfis_usuarios`. Ela autoriza apenas leitura da própria empresa; registros sem empresa não ficam públicos e nenhuma permissão de escrita é acrescentada.

O instalador grava o UID da conta uma única vez. Não usa metadados editáveis pelo usuário nem verifica somente o e-mail. Uma conta recriada com o mesmo endereço não herda a permissão. Não existe interface para promover outro usuário.

## Proteções e alcance

- Servidor valida o token e a permissão. As funções no banco repetem a autorização, inclusive quando chamadas diretamente pela API do Supabase.
- Cadastros internos e histórico ficam em um schema privado sem acesso pelos clientes. Mudança de estado e registro da ação são atômicos.
- Conta e empresa da proprietária são protegidas contra bloqueio.
- Suspensão é do acesso ao ERP: não apaga registros nem remove a conta do Supabase Auth. A interface verifica o estado a cada 15 segundos com a aba visível e ao voltar para a janela; as políticas do banco restringem cada nova operação imediatamente.
- A instalação acrescenta políticas restritivas às tabelas públicas com RLS e às tabelas com vínculo de empresa. Ela interrompe se encontrar tabela privada sem RLS, para não anunciar uma proteção inexistente. Corrija o isolamento dessa tabela e execute novamente; não desative essa verificação.
- Em novas tabelas, mantenha o isolamento por empresa e a política restritiva `gc_acesso_plataforma` (ou reexecute a instalação). Políticas existentes de isolamento são preservadas.
- Funções preexistentes com `SECURITY DEFINER`, views com privilégios do criador, Storage e serviços com chave privilegiada precisam de revisão própria: podem contornar RLS. O painel não concede acesso a documentos/orçamentos das empresas nem cria impersonação.
- Antes da migração, o ERP continua funcionando; o painel permanece indisponível. Não depende de chave `service_role` na aplicação.
- Ative MFA para a conta proprietária no fluxo de autenticação antes de ampliar operações sensíveis. Esta versão não acrescenta configuração/desafio de MFA.

## Primeira versão

Visão geral, busca/paginação de empresas e usuários, confirmação de e-mail/último acesso, suspensão/liberação com motivo e últimas 100 ações (histórico completo preservado). Novas empresas e contas continuam usando o cadastro existente. Planos, cobrança, alteração de papéis e catálogo oficial ficam para versões seguintes.

## Verificação local

`tests/plataforma-seguranca.test.cjs` executa a migração em PostgreSQL embarcado (PGlite), com papéis autenticado/anônimo, e testa negação de acesso, proteção da proprietária, bloqueio de leitura/escrita, reativação e auditoria. Instale `@electric-sql/pglite` em uma pasta de testes e configure `PGLITE_MODULE` com o caminho do módulo antes de executar `node --test tests/plataforma-seguranca.test.cjs`.

Ao selecionar Inadimplência em uma conta ativa, a tela propõe regularização por três dias corridos (data ajustável). O aviso do cliente informa a pendência, a data limite e os dias restantes. Selecionar explicitamente uma situação de suspensão continua bloqueando imediatamente no banco; não confundir suspensão com aviso. O vencimento do prazo, sozinho, não bloqueia.
