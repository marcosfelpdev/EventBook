# ADR 0003: Gestão de Equipe de Evento e Check-in com Unicidade

**Status:** aceita  
**Issues:** #78, #79, #80, #81, #82, #114, #116 (M07)  
**Regras:** RN-07 e RN-08

## Contexto

Eventos de médio e grande porte contam com portarias e atendentes de recepção (`STAFF`) responsáveis por verificar ingressos dos participantes.
Um membro de staff só deve ter permissão de check-in para eventos aos quais foi expressamente vinculado pelo organizador ou administrador.
Além disso, um ingresso deve poder ser validado exatamente uma vez; tentativas de reutilização devem ser detectadas imediatamente e bloqueadas para coibir fraudes na entrada.

## Decisão

1. **Vínculo Explícito de Equipe (RN-07):**
   - Criação da tabela relacional `event_staffs` associando `eventId` e `userId`.
   - Apenas o organizador do evento (`event.organizerId === user.id`) ou administradores (`role === 'ADMIN'`) têm permissão para listar, adicionar e remover membros.
   - Um usuário vinculado herda a autoridade para consultar dados do evento e realizar check-in de ingressos desse evento específico.

2. **Validação de Entrada e Uso Único (RN-08):**
   - Endpoint `POST /tickets/:code/checkin` autenticado com permissão exigida (`STAFF`, `ORGANIZER` ou `ADMIN`).
   - Verificação se o operador pertence à equipe do evento referente ao ingresso (`TICKET_WRONG_EVENT` ou `FORBIDDEN` em caso negativo).
   - Verificação de status do ingresso:
     - Se `status === 'CANCELLED'`, bloqueia com erro `422 TICKET_INVALID`.
     - Se `status === 'USED'`, bloqueia com erro `409 TICKET_ALREADY_USED`.
   - Se `status === 'VALID'`, marca de forma transacional como `USED`, registra `usedAt = now` e cria log de auditoria `checkin` registrando data e atendente responsável.

## Consequências

- Segurança operacional de portaria sem concessão de privilégios excessivos (staff não pode alterar lotes, preços ou detalhes do evento).
- Auditoria precisa de horários de pico e operadores responsáveis pelo fluxo na entrada.
