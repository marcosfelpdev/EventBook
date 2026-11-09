# Pedidos e reserva temporária (M05)

## Criar pedido

`POST /orders`, autenticado como BUYER, recebe `{ "lotId": 1, "quantity": 2 }`.
IDs e quantidades são inteiros positivos de até 2147483647. Cada pedido reserva um lote.
Retorna 201 com o pedido e `items`: `id`, `userId`, `status: "PENDING"`, `total`, `createdAt`, `expiresAt`, `paidAt`, `cancelledAt`; itens contêm `lotId`, `quantity`, `unitPriceSnapshot`.
Valores Decimal são serializados como strings; datas em UTC. O total usa o snapshot, nunca o preço enviado pelo cliente.

O evento precisa estar publicado, o lote ativo e o horário dentro da janela inclusiva.
A reserva dura exatamente 15 minutos. Antes de calcular estoque, pedidos vencidos daquele lote são expirados. Estoque ocupado soma itens PAID e PENDING não vencidos, por agregação no banco.

Erros seguem `{ code, message, details? }`: 400 VALIDATION_ERROR; 401 UNAUTHENTICATED; 403 FORBIDDEN; 404 NOT_FOUND; 422 EVENT_NOT_PUBLISHED, LOT_INACTIVE ou LOT_OUT_OF_SALE_WINDOW; 409 INSUFFICIENT_STOCK (details com lotId, available e requested).

A criação e seus itens usam uma transação READ COMMITTED com `SELECT ... FOR UPDATE` no lote antes de ler preço, janela e estoque. Compras do mesmo lote aguardam o lock e recalculam estoque após a reserva anterior; excedentes recebem 409. A edição da quantidade do lote usa o mesmo lock e rejeita redução abaixo dos itens pagos e reservados válidos. SQL parametrizado pelo Prisma. O teste concorrente contra MySQL real é entregue na #63.
