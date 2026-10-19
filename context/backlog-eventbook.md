# Milestones e Issues Backlog - EventBook (v3)

Cada `###` é uma Issue do GitHub. As tarefas com `- [ ]` viram checkboxes clicáveis no corpo da issue, e o GitHub mostra o progresso (ex.: 2/4) nos boards e listas. Fluxo: `Issue -> Branch -> Commit -> PR -> Code Review -> Merge`.

## ✅ Definition of Done (vale para toda issue)

1. Critérios de aceite atendidos e ligados à RN correspondente.
2. Testes automatizados da regra ou endpoint, passando no CI.
3. Loading, empty e error states (UI) e erros no formato padrão `{code, message, details}` (API).
4. OpenAPI ou README atualizado quando houver mudança de contrato.
5. PR com no mínimo 1 review e CI verde.

## 🔄 Regras de processo

- **Kanban:** `Backlog → Ready → In Progress → In Review → Done`.
- Uma issue só entra em *Ready* com critérios de aceite e dependências listadas.
- **WIP:** máximo de 2 itens em *In Progress* por pessoa e 3 em *In Review* no total.
- **Paralelismo:** com o contrato OpenAPI definido no início de cada milestone, a UI trabalha contra mocks enquanto a API é construída.
- **Caminho crítico:** M01 → M02 → M03 → M04 → M05 → M06 → M07. M08 e a preparação do M09 podem andar em paralelo com o M07.

---

## 🎯 M01: Fundação e Infraestrutura

### [Infra] Configurar repositório
- [x] Labels (tipo, prioridade, tamanho)
- [x] Templates de Issue e PR
- [x] CODEOWNERS
- [x] Convenção de branches e commits documentada

### [Docs] Documentar regras de negócio e convenções
- [x] RN-01 a RN-10 com critérios de aceite
- [x] ERD inicial
- [x] Matriz de perfis e permissões
- [x] Convenção de erros `{code, message, details}`

### [API] Inicializar Node.js e TypeScript
- [x] package.json e scripts (dev, build, start)
- [x] tsconfig com `strict`
- [x] Estrutura de pastas (routes, controllers, services, middlewares)

### [API] Configurar Express, ESLint e Prettier
- [x] Servidor Express base
- [x] ESLint e Prettier com scripts `lint` e `format`
- [x] Endpoint `GET /health`
- [x] Error handler global com formato padronizado

### [UI] Inicializar React com Vite
- [x] Projeto Vite + React + TypeScript
- [x] Biblioteca de estilização
- [x] Estrutura de pastas (pages, components, services, hooks)

### [UI] Configurar ESLint e Prettier no frontend
- [x] Regras de ESLint para React + TypeScript
- [x] Prettier e scripts `lint` e `format`

### [Infra] Criar docker-compose inicial com MySQL
- [x] Serviço MySQL com volume e healthcheck
- [x] `.env.example` com todas as variáveis

### [DB] Configurar Prisma e conexão com MySQL
- [x] Instalar Prisma ORM
- [x] Conexão via `DATABASE_URL` no `.env`
- [x] Executar `prisma init` e validar a estrutura de migrations

### [Tests] Configurar frameworks de teste
- [x] Vitest/Jest + Supertest na API
- [x] Vitest + Testing Library na UI
- [x] Banco de teste isolado com reset entre suítes

### [Infra] Criar pipeline de CI (GitHub Actions)
- [x] Job de lint (API e UI)
- [x] Job de typecheck e build
- [x] Job de testes
- [x] Cache de dependências

### [Infra] Ativar proteção da branch main
- [x] Exigir PR e no mínimo 1 review
- [x] Exigir checks do CI verdes
- [x] Bloquear push direto e force push

### [Infra] Criar Dockerfiles
- [x] Dockerfile do backend
- [x] Dockerfile do frontend (multi-stage)
- [x] `.dockerignore` em ambos

### [Infra] Completar docker-compose
- [x] Unificar frontend, backend e MySQL
- [x] Ordem de subida com `depends_on` e healthchecks
- [x] Rodar migrations na inicialização
- [x] Validar subida com um único comando

## 🔐 M02: Autenticação e Perfis (RBAC)

### [DB] Criar schema de users e enum de perfis
- [x] Tabela `users` (e-mail único, hash de senha)
- [x] Enum `Role`: ADMIN, ORGANIZER, STAFF, BUYER
- [x] Migration

### [DB] Criar seed de usuários de teste
- [x] Um usuário por perfil
- [x] Script idempotente (upsert)

### [API] Criar middleware de validação de payload
- [x] Middleware genérico com Zod
- [x] Resposta de erro no formato padrão

### [API] Criar POST /register
- [x] Validação de payload
- [x] Hash de senha
- [x] Sempre criar como BUYER (ignorar perfil enviado)
- [x] E-mail duplicado retorna 409

### [API] Criar POST /login e serviço de JWT
- [x] Validação de credenciais
- [x] Geração de JWT (secret e expiração via env)
- [x] Erro 401 genérico para credenciais inválidas

### [API] Criar middlewares authenticate e authorize
- [x] `authenticate`: valida o JWT
- [x] `authorize(roles)`: RBAC por perfil
- [x] Retornar 401 e 403 corretamente

### [API] Criar GET /me
- [x] Retornar usuário autenticado
- [x] Não expor hash de senha

### [Tests] Testes de integração de autenticação
- [x] Registro (sucesso e duplicado)
- [x] Login (sucesso e falha)
- [x] RBAC (401 e 403)

### [UI] Configurar cliente HTTP (Axios)
- [x] Instância com `baseURL` via env
- [x] Interceptor de envio automático do token
- [x] Interceptor de erros (400, 401, 403, 404, 409, 422, 500)

### [UI] Criar componentes base de estado
- [x] `Loading`
- [x] `EmptyState`
- [x] `ErrorState`

### [UI] Criar AuthContext e rotas privadas
- [x] Contexto global de autenticação
- [x] Persistência do token e logout
- [x] Wrapper de rotas privadas com checagem de perfil

### [UI] Desenvolver formulários de Cadastro e Login
- [x] Validação de campos
- [x] Exibição de erros vindos da API
- [x] Redirecionamento após sucesso

## 📅 M03: Gestão de Eventos

### [DB] Criar schema de events
- [ ] FK para organizer
- [ ] `capacity`, `starts_at` e `ends_at` (UTC)
- [ ] `status`: DRAFT, PUBLISHED, CANCELLED
- [ ] Migration

### [DB] Atualizar seed com eventos de demonstração
- [ ] Eventos em vários status
- [ ] Ao menos um evento passado

### [API] Criar GET /events
- [ ] Rota pública, somente publicados
- [ ] Paginação

### [API] Criar GET /events/:id
- [ ] Detalhe do evento
- [ ] 404 para inexistente ou não publicado (exceto dono)

### [API] Criar POST /events
- [ ] Restrito a ORGANIZER
- [ ] Validação de payload e datas
- [ ] Evento nasce como DRAFT

### [API] Criar PATCH /events/:id com RN-01
- [ ] Checagem de dono do evento
- [ ] RN-01: bloquear edição de evento no passado
- [ ] Validação de payload

### [Tests] Testes de integração de eventos
- [ ] Ownership (403 para não dono)
- [ ] RN-01 (edição no passado)
- [ ] Listagem pública e paginação

### [UI] Desenvolver vitrine pública de eventos
- [ ] Listagem com paginação
- [ ] Loading, empty e error states

### [UI] Desenvolver detalhe do evento
- [ ] Informações do evento
- [ ] Área reservada para lotes (M04)

### [UI] Construir shell do Painel do Organizador
- [ ] Layout com navegação
- [ ] Rota protegida para ORGANIZER

### [UI] Desenvolver formulário de criação e edição de evento
- [ ] Validação de campos e datas
- [ ] Modo criação e modo edição
- [ ] Tratamento de erros da API

## 🎟️ M04: Gestão de Lotes e Capacidade

### [DB] Criar schema de ticket_lots
- [ ] Preço, quantidade e janela de venda
- [ ] Flag de ativo
- [ ] FK para evento
- [ ] Migration

### [DB] Atualizar seed com lotes
- [ ] Lotes ativos
- [ ] Lotes inativos
- [ ] Lotes esgotados

### [API] Criar POST /events/:id/lots com validações
- [ ] Restrito ao dono do evento
- [ ] Soma dos lotes ≤ `capacity` do evento
- [ ] Consistência de datas (janela de venda dentro do evento)

### [API] Criar GET e PATCH de lotes
- [ ] `GET /events/:id/lots` (público: ativos; organizador: todos)
- [ ] `PATCH /events/:id/lots/:lotId`
- [ ] Revalidar capacidade na edição

### [API] Criar POST /events/:id/publish com RN-01
- [ ] RN-01: bloquear publicação sem lotes
- [ ] Bloquear publicação de evento no passado
- [ ] Mudar status para PUBLISHED

### [Tests] Testes de lotes e publicação
- [ ] Limite de capacidade
- [ ] Datas inconsistentes
- [ ] Publicação sem lotes

### [UI] Desenvolver listagem de lotes no Painel
- [ ] Tabela com status e disponibilidade
- [ ] Empty state

### [UI] Desenvolver formulário de lotes
- [ ] Criação e edição
- [ ] Validação de capacidade e datas

### [UI] Exibir lotes no detalhe e botão Publicar
- [ ] Lotes ativos no detalhe do evento
- [ ] Botão "Publicar" no Painel com tratamento de erro da RN-01

## 🛒 M05: Pedido e Reserva Temporária

### [Docs] Spike e ADR de concorrência e expiração
- [ ] Comparar lock pessimista, update condicional e contador
- [ ] Definir estratégia de expiração (lazy + job)
- [ ] Registrar decisão em ADR

### [DB] Criar schema de orders e order_items
- [ ] `orders`: usuário, status, `expires_at`
- [ ] `order_items`: lote, quantidade, `unit_price_snapshot` (RN-09)
- [ ] Índices para consulta de estoque e expiração
- [ ] Migration

### [API] Criar POST /orders (RN-04, RN-02 e RN-09)
- [ ] Expirar reservas vencidas antes do cálculo (RN-04)
- [ ] Validar janela de venda e estoque remanescente (RN-02)
- [ ] Gravar snapshot do preço do lote (RN-09)

### [API] Implementar RN-03: bloqueio de overselling
- [ ] Transação com lock conforme ADR
- [ ] Retornar 409 quando o estoque acabar

### [API] Criar job de expiração de pedidos
- [ ] Marcar como `expired` após 15 minutos (RN-04)
- [ ] Liberar a reserva

### [API] Criar GET /orders/:id e cancelamento de pedido pendente
- [ ] Consulta restrita ao dono
- [ ] Cancelar pedido `pending` liberando a reserva

### [Tests] Teste de concorrência do overselling (RN-03)
- [ ] N requisições paralelas contra o mesmo lote
- [ ] Nunca vender acima do estoque
- [ ] Executar com banco real

### [Tests] Testes de RN-02 e RN-04
- [ ] Bordas da janela de venda
- [ ] Expiração após 15 minutos
- [ ] Estoque liberado após expiração

### [UI] Desenvolver seleção de quantidade de ingressos
- [ ] Controle de quantidade por lote
- [ ] Respeitar estoque disponível

### [UI] Desenvolver resumo do carrinho
- [ ] Consumir a API de pedidos
- [ ] Contador regressivo da reserva
- [ ] Tratamento do erro 409

## 💳 M06: Checkout Atômico e Cancelamento

### [DB] Criar schema de tickets
- [ ] Código único
- [ ] Relação com pedido, lote e evento
- [ ] Status do ingresso
- [ ] Migration

### [API] Criar POST /orders/:id/checkout
- [ ] Gateway de pagamento simulado injetável
- [ ] Permitir forçar falha nos testes
- [ ] Bloquear pedido expirado ou já pago

### [API] Implementar RN-05: transação atômica
- [ ] Marcar pedido como `paid`
- [ ] Gerar tickets com códigos únicos
- [ ] Rollback completo em qualquer falha

### [Tests] Testar rollback do checkout (RN-05)
- [ ] Falha do gateway não altera o pedido
- [ ] Nenhum ticket é criado em caso de falha

### [API] Criar cancelamento de pedido pago (RN-06)
- [ ] Bloquear cancelamento com menos de 12h do evento
- [ ] Devolver estoque
- [ ] Invalidar tickets

### [Tests] Testar bordas da RN-06
- [ ] 11h59 antes do evento (bloqueado)
- [ ] 12h00 antes do evento (permitido)

### [API] Criar GET /tickets/me e GET /orders/me
- [ ] Listagem apenas do próprio usuário
- [ ] Paginação

### [UI] Desenvolver simulação de pagamento
- [ ] Estado de loading
- [ ] Estado de sucesso
- [ ] Estado de falha com nova tentativa

### [UI] Desenvolver página Meus Ingressos
- [ ] Listagem de ingressos com código
- [ ] Histórico de pedidos
- [ ] Empty state

### [UI] Integrar botão de cancelamento dinâmico
- [ ] Desabilitar conforme a RN-06
- [ ] Mensagem clara com o motivo do bloqueio

## 📲 M07: Staff e Check-in

### [DB] Criar schema de event_staff e checkins
- [ ] `event_staff` (evento + usuário)
- [ ] `checkins` com unique por ticket
- [ ] Migration

### [API] Criar gestão de staff do evento
- [ ] `POST /events/:id/staff`
- [ ] `GET /events/:id/staff`
- [ ] `DELETE /events/:id/staff/:userId`
- [ ] Checagem de dono do evento

### [API] Criar POST /tickets/:code/checkin (RN-07 e RN-08)
- [ ] Exigir staff vinculado ao evento
- [ ] RN-07: ticket existe, pertence ao evento e não foi usado
- [ ] RN-08: janela de `starts_at - 2h` até `ends_at`

### [Tests] Testar RN-07
- [ ] Ticket inexistente
- [ ] Ticket de outro evento
- [ ] Ticket já usado
- [ ] Check-in duplicado concorrente

### [Tests] Testar RN-08
- [ ] Borda `starts_at - 2h`
- [ ] Borda `ends_at`
- [ ] Cenários em UTC

### [UI] Desenvolver gestão de equipe no Painel
- [ ] Listar staff do evento
- [ ] Adicionar e remover staff

### [UI] Desenvolver tela de Check-in
- [ ] Campo de digitação de código
- [ ] Foco automático e envio por Enter

### [UI] Implementar alertas visuais de check-in
- [ ] 200: permitido
- [ ] 409: duplicado
- [ ] 422: recusado

## 📊 M08: Ocupação

### [API] Criar GET /events/:id/occupancy (RN-10)
- [ ] Endpoint restrito ao dono do evento
- [ ] Agregações executadas no banco
- [ ] Total, vendidos, check-ins e ocupação por lote

### [Tests] Testar RN-10
- [ ] Massa de dados conhecida
- [ ] Conferir totais agregados

### [UI] Desenvolver dashboard de estatísticas
- [ ] Consumir a API de ocupação
- [ ] Cards e gráfico por lote
- [ ] Loading, empty e error states

## 🚀 M09: Hardening e Release

### [API] Reforçar segurança
- [ ] Helmet
- [ ] CORS restrito
- [ ] Rate limit em `/login` e `/register`

### [UI] Auditar estados de UI e erros
- [ ] Loading e empty states em todas as telas
- [ ] Tratamento dos erros 400, 401, 403, 404, 409, 422 e 500

### [Tests] Criar E2E do fluxo principal
- [ ] Playwright: cadastro → compra → check-in
- [ ] Rodar no CI

### [Docs] Finalizar OpenAPI e ADRs
- [ ] Todos os endpoints documentados
- [ ] ADRs atualizadas

### [Infra] Elaborar README técnico
- [ ] Instruções de uso
- [ ] Endpoints principais
- [ ] Decisões de arquitetura

### [Infra] Publicar release
- [ ] Tag `v1.0.0`
- [ ] Release notes
