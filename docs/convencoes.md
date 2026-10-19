# Convenções do Projeto

## Fluxo de trabalho

`Issue → Branch → Commit → PR → Code Review → Merge`

- Toda mudança nasce de uma Issue. Não há commit direto na `main`.
- Merge somente com **CI verde** e **no mínimo 1 aprovação**.
- Preferência por *squash merge*, mantendo o histórico da `main` linear.

## Branches

Formato: `<tipo>/<numero-da-issue>-<descricao-curta>`

| Tipo | Uso | Exemplo |
|---|---|---|
| `feat` | Nova funcionalidade | `feat/42-post-orders` |
| `fix` | Correção de bug | `fix/57-checkin-duplicado` |
| `chore` | Infra, dependências, configuração | `chore/8-ci-github-actions` |
| `docs` | Documentação | `docs/3-regras-de-negocio` |
| `test` | Testes | `test/61-concorrencia-overselling` |
| `refactor` | Refatoração sem mudar comportamento | `refactor/70-stock-service` |

## Commits (Conventional Commits)

Formato: `<tipo>(<escopo>): <descrição no imperativo>`

```
feat(backend): add POST /orders with stock validation
fix(frontend): handle 409 on cart summary
test(backend): cover checkout rollback (RN-05)
chore(infra): add mysql service to docker-compose
```

Escopos: `backend`, `frontend`, `db`, `infra`, `docs`, `tests`.

## Pull Requests

- Título no mesmo formato dos commits.
- Descrição com `Closes #<issue>`, resumo da mudança e como testar.
- Marque no PR as RNs afetadas, quando houver.
- PRs pequenos (uma issue por PR).

## Labels

| Label | Área |
|---|---|
| `ui` | Front-end |
| `api` | Back-end |
| `db` | Banco de dados |
| `infra` | Docker, CI/CD, repositório, entrega |
| `tests` | Testes automatizados |
| `docs` | Documentação |

## Formato padrão de erros da API

Toda resposta de erro segue:

```json
{
  "code": "INSUFFICIENT_STOCK",
  "message": "Não há ingressos suficientes neste lote.",
  "details": { "lotId": 12, "available": 3, "requested": 5 }
}
```

`details` é opcional. Em erros de validação, traz a lista de campos inválidos.

### Mapa de status HTTP

| Status | Quando usar | Códigos (`code`) |
|---|---|---|
| `400` | Payload malformado ou inválido | `VALIDATION_ERROR` |
| `401` | Não autenticado ou token inválido | `UNAUTHENTICATED`, `INVALID_CREDENTIALS` |
| `403` | Autenticado, sem permissão | `FORBIDDEN` |
| `404` | Recurso inexistente | `NOT_FOUND`, `TICKET_NOT_FOUND` |
| `409` | Conflito de estado ou concorrência | `EMAIL_ALREADY_EXISTS`, `INSUFFICIENT_STOCK`, `TICKET_ALREADY_USED`, `ORDER_ALREADY_PAID` |
| `422` | Regra de negócio violada | `EVENT_IN_PAST`, `EVENT_WITHOUT_LOTS`, `LOT_OUT_OF_SALE_WINDOW`, `LOT_INACTIVE`, `ORDER_EXPIRED`, `CANCELLATION_WINDOW_CLOSED`, `CHECKIN_WINDOW_CLOSED`, `TICKET_WRONG_EVENT`, `TICKET_INVALID` |
| `500` | Erro inesperado | `INTERNAL_ERROR` |

O error handler global nunca expõe stack trace nem detalhes internos em `500`.

## Datas e horários

- Armazenamento e API em **UTC**, formato ISO 8601 (`2026-10-05T18:30:00Z`).
- A conversão para o fuso do usuário é feita **somente na UI**.
- Regras com janela (RN-02, RN-06, RN-08) comparam sempre em UTC.

## Código

- TypeScript com `strict` ativo, sem `any` implícito.
- Nomes de arquivos: `camelCase` para módulos da API (`orders.service.ts`) e `PascalCase` para componentes React (`CartSummary.tsx`).
- Rotas REST no plural e em inglês (`/events`, `/orders`).
- Variáveis de ambiente validadas na inicialização (`config/env.ts`). A API não sobe com configuração inválida.
- Segredos nunca são versionados. Use `.env` local e mantenha o `.env.example` atualizado.

## Definition of Done

1. Critérios de aceite atendidos e ligados à RN correspondente.
2. Testes automatizados passando no CI.
3. Loading, empty e error states (UI) e erros no formato padrão (API).
4. OpenAPI ou README atualizado quando houver mudança de contrato.
5. PR com no mínimo 1 review e CI verde.
