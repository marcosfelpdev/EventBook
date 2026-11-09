# Pedidos e reserva temporária (M05)

## Consulta e cancelamento

`GET /orders/:id` retorna 200 com pedido e itens, exclusivamente para o dono autenticado. Pedido inexistente ou de outra pessoa retorna 404 NOT_FOUND. A consulta atualiza reservas vencidas para EXPIRED.

`POST /orders/:id/cancel` cancela somente pedido PENDING ainda válido do dono e retorna 200 com status CANCELLED e cancelledAt. Repetir o cancelamento retorna o pedido já cancelado (idempotente). A alteração condicional no banco evita sobrescrever estados concorrentes. Como itens CANCELLED não entram na soma, o estoque é liberado sem contador.

Pedido vencido retorna 422 ORDER_EXPIRED; pago retorna 409 ORDER_ALREADY_PAID. Cancelamento de pagos (RN-06) pertence à M06. IDs malformados retornam 400 VALIDATION_ERROR; chamadas sem token retornam 401.

## Expiração automática

Ao iniciar o servidor, o job expira pedidos PENDING com `expiresAt <= agora` e repete a cada minuto. Reutiliza a mesma função da expiração lazy; pedidos PAID/CANCELLED/EXPIRED não são alterados. A consulta de estoque ignora reservas vencidas imediatamente, mesmo antes do próximo ciclo. Não existe contador para decrementar, nem exclusão de histórico.

O job não sobrepõe execuções no mesmo processo, registra falhas e tenta novamente no ciclo seguinte. SIGINT/SIGTERM interrompem o timer e aguardam operações em andamento antes de desconectar o Prisma. Importar `app` nos testes não inicia timers. A atualização condicional torna múltiplas instâncias idempotentes.

## Criar pedido

`POST /orders`, autenticado como BUYER, recebe `{ "lotId": 1, "quantity": 2 }`.
IDs e quantidades são inteiros positivos de até 2147483647. Cada pedido reserva um lote.
Retorna 201 com o pedido e `items`: `id`, `userId`, `status: "PENDING"`, `total`, `createdAt`, `expiresAt`, `paidAt`, `cancelledAt`; itens contêm `lotId`, `quantity`, `unitPriceSnapshot`.
Valores Decimal são serializados como strings; datas em UTC. O total usa o snapshot, nunca o preço enviado pelo cliente.

O evento precisa estar publicado, o lote ativo e o horário dentro da janela inclusiva.
A reserva dura exatamente 15 minutos. Antes de calcular estoque, pedidos vencidos daquele lote são expirados. Estoque ocupado soma itens PAID e PENDING não vencidos, por agregação no banco.

Erros seguem `{ code, message, details? }`: 400 VALIDATION_ERROR; 401 UNAUTHENTICATED; 403 FORBIDDEN; 404 NOT_FOUND; 422 EVENT_NOT_PUBLISHED, LOT_INACTIVE ou LOT_OUT_OF_SALE_WINDOW; 409 INSUFFICIENT_STOCK (details com lotId, available e requested).

A criação e seus itens usam uma transação READ COMMITTED com `SELECT ... FOR UPDATE` no lote antes de ler preço, janela e estoque. Compras do mesmo lote aguardam o lock e recalculam estoque após a reserva anterior; excedentes recebem 409. A edição da quantidade do lote usa o mesmo lock e rejeita redução abaixo dos itens pagos e reservados válidos. SQL parametrizado pelo Prisma. O teste concorrente contra MySQL real é entregue na #63.
