# Modelo de Dados (ERD inicial)

Versão inicial. Cada tabela é criada na milestone indicada, e o modelo é refinado durante o desenvolvimento. Datas em UTC.

```mermaid
erDiagram
    users ||--o{ events : "organiza"
    users ||--o{ orders : "compra"
    users ||--o{ event_staff : "atua como"
    events ||--o{ ticket_lots : "possui"
    events ||--o{ event_staff : "tem"
    events ||--o{ tickets : "emite"
    ticket_lots ||--o{ order_items : "reservado em"
    orders ||--|{ order_items : "contém"
    orders ||--o{ tickets : "gera"
    ticket_lots ||--o{ tickets : "origina"
    tickets ||--o| checkins : "validado em"
    users ||--o{ checkins : "realiza"

    users {
        int id PK
        string name
        string email UK
        string password_hash
        enum role "ADMIN, ORGANIZER, STAFF, BUYER"
        datetime created_at
    }
    events {
        int id PK
        int organizer_id FK
        string title
        text description
        string location
        int capacity
        datetime starts_at
        datetime ends_at
        enum status "DRAFT, PUBLISHED, CANCELLED"
        datetime created_at
    }
    ticket_lots {
        int id PK
        int event_id FK
        string name
        decimal price
        int quantity
        datetime sales_start_at
        datetime sales_end_at
        boolean active
    }
    orders {
        int id PK
        int user_id FK
        enum status "PENDING, PAID, EXPIRED, CANCELLED"
        decimal total
        datetime expires_at
        datetime created_at
        datetime paid_at
        datetime cancelled_at
    }
    order_items {
        int id PK
        int order_id FK
        int lot_id FK
        int quantity
        decimal unit_price_snapshot "RN-09"
    }
    tickets {
        int id PK
        int order_id FK
        int lot_id FK
        int event_id FK
        string code UK
        enum status "VALID, USED, CANCELLED"
    }
    event_staff {
        int id PK
        int event_id FK
        int user_id FK
    }
    checkins {
        int id PK
        int ticket_id FK, UK "barreira de duplicidade (RN-07)"
        int staff_id FK
        datetime checked_in_at
    }
```

## Tabelas por milestone

| Milestone | Tabelas |
|---|---|
| M02 | `users` |
| M03 | `events` |
| M04 | `ticket_lots` |
| M05 | `orders`, `order_items` |
| M06 | `tickets` |
| M07 | `event_staff`, `checkins` |

## Restrições importantes

- `users.email` é único.
- `tickets.code` é único (RN-05).
- `checkins.ticket_id` é único: o banco impede check-in duplicado, mesmo sob concorrência (RN-07).
- `event_staff (event_id, user_id)` é único.
- Índices previstos: `orders (status, expires_at)` para a expiração (RN-04) e `order_items (lot_id)` para o cálculo de estoque (RN-02).
- Regra de capacidade (M04): a soma de `ticket_lots.quantity` de um evento não pode exceder `events.capacity`.
