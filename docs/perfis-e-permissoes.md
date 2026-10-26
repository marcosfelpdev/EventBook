# Perfis e Permissões

## Perfis

| Perfil | Descrição |
|---|---|
| `BUYER` | Comprador. Perfil atribuído a todo cadastro via `POST /register`. |
| `ORGANIZER` | Cria e gerencia os próprios eventos, lotes, equipe e consulta a ocupação. |
| `STAFF` | Perfil elegível para integrar a equipe de eventos. A atuação em um evento exige vínculo em `event_staff`. |
| `ADMIN` | Reservado. Sem funcionalidades na v1.0 além de existir no seed. |

`ORGANIZER`, `STAFF` e `ADMIN` só são criados pelo seed ou por promoção manual. O registro público **nunca** aceita um perfil privilegiado.

## Autorização em dois níveis

1. **Por perfil (RBAC):** o middleware `authorize(roles)` valida se o perfil pode acessar a rota.
2. **Por recurso (ownership):** o service valida se o usuário é dono do recurso ou está vinculado a ele.
   - Só o organizador **dono** do evento o edita, publica, gerencia lotes e staff, e consulta a ocupação.
   - Só o staff **vinculado** ao evento faz check-in nele.
   - Só o **dono** do pedido o consulta, paga ou cancela.

## Matriz de permissões

Legenda: ✅ permitido · 🔒 permitido com checagem de recurso · ❌ negado

| Endpoint | Anônimo | BUYER | ORGANIZER | STAFF | ADMIN |
|---|:-:|:-:|:-:|:-:|:-:|
| `GET /health` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `POST /register`, `POST /login` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `GET /me` | ❌ | ✅ | ✅ | ✅ | ✅ |
| `GET /events`, `GET /events/:id` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `GET /events/:id/lots` | ✅ ativos | ✅ ativos | 🔒 todos (dono) | ✅ ativos | ✅ ativos |
| `POST /events` | ❌ | ❌ | ✅ | ❌ | ❌ |
| `PATCH /events/:id`, `POST /events/:id/publish` | ❌ | ❌ | 🔒 dono | ❌ | ❌ |
| `POST /events/:id/lots`, `PATCH /events/:id/lots/:lotId` | ❌ | ❌ | 🔒 dono | ❌ | ❌ |
| `POST/GET/DELETE /events/:id/staff` | ❌ | ❌ | 🔒 dono | ❌ | ❌ |
| `GET /events/:id/occupancy` | ❌ | ❌ | 🔒 dono | ❌ | ❌ |
| `POST /orders` | ❌ | ✅ | ❌ | ❌ | ❌ |
| `GET /orders/:id`, `/orders/me` | ❌ | 🔒 dono | ❌ | ❌ | ❌ |
| `POST /orders/:id/checkout` | ❌ | 🔒 dono | ❌ | ❌ | ❌ |
| Cancelamento de pedido | ❌ | 🔒 dono | ❌ | ❌ | ❌ |
| `GET /tickets/me` | ❌ | ✅ | ❌ | ❌ | ❌ |
| `POST /tickets/:code/checkin` | ❌ | ❌ | ❌ | 🔒 vinculado | ❌ |

## Usuários do seed

| Perfil | E-mail |
|---|---|
| ADMIN | `admin@eventbook.test` |
| ORGANIZER | `organizer@eventbook.test` |
| STAFF | `staff@eventbook.test` |
| BUYER | `buyer@eventbook.test` |

A senha vem de uma variável de ambiente (`SEED_PASSWORD`) e nunca é versionada.
