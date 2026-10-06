# Regras de Negócio (RN-01 a RN-10)

Documento de referência das regras do EventBook. Cada RN tem critérios de aceite verificáveis e aponta a milestone que a implementa e o teste que a protege. Todos os horários são armazenados e comparados em **UTC**.

> Itens marcados com ⚠️ são interpretações feitas a partir do backlog e precisam de confirmação (ver [Decisões em aberto](#decisões-em-aberto)).

---

## RN-01: Integridade do evento
**Milestones:** M03 (edição) e M04 (publicação)

- Um evento cujo `starts_at` já passou **não pode ser editado**.
- Um evento **sem lotes não pode ser publicado**.

**Critérios de aceite**
- `PATCH /events/:id` em evento passado → `422 EVENT_IN_PAST`.
- `POST /events/:id/publish` sem nenhum lote → `422 EVENT_WITHOUT_LOTS`.
- Publicar evento no passado → `422 EVENT_IN_PAST`.

**Testes:** `events.test.ts`, `publish.test.ts`

---

## RN-02: Janela de venda e estoque remanescente
**Milestone:** M05

- Só é possível reservar ingressos de um lote **ativo** e dentro da janela `sales_start_at ≤ agora ≤ sales_end_at`.
- Estoque remanescente = `quantity` do lote − (ingressos vendidos + reservas `pending` não expiradas).

**Critérios de aceite**
- Pedido antes do início ou depois do fim da janela → `422 LOT_OUT_OF_SALE_WINDOW`.
- Pedido em lote inativo → `422 LOT_INACTIVE`.
- Quantidade acima do estoque remanescente → `409 INSUFFICIENT_STOCK`.
- Reservas expiradas **não** contam no estoque (ver RN-04).

**Testes:** `orders.window.test.ts` (bordas exatas da janela)

---

## RN-03: Proibição de overselling
**Milestone:** M05

- A soma de ingressos vendidos e reservados de um lote nunca pode ultrapassar a sua `quantity`, mesmo sob requisições concorrentes.

**Critérios de aceite**
- N requisições paralelas disputando o mesmo estoque: o total aceito nunca excede o estoque.
- As requisições excedentes recebem `409 INSUFFICIENT_STOCK`.
- A verificação e a reserva ocorrem na mesma transação, conforme a estratégia da ADR 0001.

**Testes:** `orders.concurrency.test.ts` (teste de integração com banco real)

---

## RN-04: Expiração da reserva
**Milestone:** M05

- Um pedido `pending` expira **15 minutos** após a criação (`expires_at = created_at + 15 min`) e passa a `expired`.
- Reservas expiradas devolvem o estoque.

**Critérios de aceite**
- A expiração é aplicada de forma *lazy* (antes de calcular estoque) e por um job periódico.
- Checkout de pedido expirado → `422 ORDER_EXPIRED`.
- Após expirar, o estoque do lote volta a ficar disponível.

**Testes:** `orders.expiration.test.ts`

---

## RN-05: Checkout atômico
**Milestone:** M06

- O checkout marca o pedido como `paid` **e** gera todos os tickets em uma única transação.
- Qualquer falha (pagamento, geração de código, banco) desfaz tudo.

**Critérios de aceite**
- Falha do gateway simulado → pedido continua `pending` e **nenhum** ticket é criado.
- Cada ticket recebe um `code` único.
- Checkout de pedido já pago → `409 ORDER_ALREADY_PAID`.

**Testes:** `checkout.rollback.test.ts` (gateway injetável com falha forçada)

---

## RN-06: Prazo de cancelamento
**Milestone:** M06

- Pedido pago **não pode ser cancelado com menos de 12 horas** de antecedência do início do evento ⚠️ (referência: `events.starts_at`).
- O cancelamento devolve o estoque e invalida os tickets.

**Critérios de aceite**
- Faltando 12h00 ou mais → cancelamento permitido.
- Faltando 11h59 ou menos → `422 CANCELLATION_WINDOW_CLOSED`.
- Tickets cancelados passam a `cancelled` e não permitem check-in.

**Testes:** `cancellation.test.ts` (bordas 11h59 / 12h00)

---

## RN-07: Validade do check-in
**Milestone:** M07

- O check-in só é aceito se o ticket **existe**, **pertence ao evento** em que o staff atua e **ainda não foi usado**.

**Critérios de aceite**
- Código inexistente → `404 TICKET_NOT_FOUND`.
- Ticket de outro evento → `422 TICKET_WRONG_EVENT`.
- Ticket já utilizado → `409 TICKET_ALREADY_USED`, inclusive em requisições concorrentes (garantido por `unique(ticket_id)` em `checkins`).
- Ticket `cancelled` → `422 TICKET_INVALID`.

**Testes:** `checkin.rn07.test.ts`

---

## RN-08: Janela de check-in
**Milestone:** M07

- O check-in só é permitido entre `starts_at − 2h` e `ends_at` (limites inclusivos).

**Critérios de aceite**
- Antes de `starts_at − 2h` ou depois de `ends_at` → `422 CHECKIN_WINDOW_CLOSED`.
- Os dois limites exatos são aceitos.

**Testes:** `checkin.rn08.test.ts` (bordas, em UTC)

---

## RN-09: Snapshot de preço
**Milestone:** M05

- O preço unitário do lote no momento da reserva é gravado em `order_items.unit_price_snapshot`.

**Critérios de aceite**
- Alterar o preço do lote depois da reserva **não** altera o valor do pedido.
- O total do pedido é calculado a partir dos snapshots.

**Testes:** coberto em `orders.*.test.ts`

---

## RN-10: Ocupação calculada no banco
**Milestone:** M08

- Os números do painel de ocupação são calculados por **agregação no próprio banco** (`COUNT`/`SUM`/`GROUP BY`), sem carregar registros na aplicação para somar.

**Critérios de aceite**
- `GET /events/:id/occupancy` retorna total de ingressos, vendidos, check-ins e ocupação por lote.
- Acesso restrito ao organizador dono do evento.

**Testes:** `occupancy.test.ts` (massa de dados conhecida)

---

## Decisões em aberto

| # | Ponto | Proposta adotada neste documento |
|---|---|---|
| 1 | Referência das 12h da RN-06 | `events.starts_at` |
| 2 | Escopo do perfil `ADMIN` | Reservado, sem funcionalidades na v1.0 |
| 3 | Quem pode comprar ingressos | Perfil `BUYER` |
| 4 | Vincular staff exige o perfil `STAFF` | Sim |
| 5 | Limite de ingressos por pedido | Sem limite além do estoque |
| 6 | Janela de venda do lote precisa estar dentro do evento | Sim (`sales_end_at ≤ ends_at`) |
