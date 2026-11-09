# ADR 0001: Concorrência de estoque e expiração da reserva

**Status:** aceita  
**Issue:** #57  
**Regras:** RN-02, RN-03, RN-04 e RN-09

## Contexto

`POST /orders` reserva ingressos por 15 minutos. Duas pessoas podem pedir o último ingresso ao mesmo tempo. O sistema precisa garantir que a soma de ingressos vendidos e reservados nunca passe da `quantity` do lote.

O estoque remanescente é calculado, não guardado numa coluna:

`quantity` − (ingressos vendidos + reservas `pending` que ainda não expiraram).

Nesta milestone ainda não existe checkout. "Vendido" entra na conta só quando a M06 criar tickets. Até lá, o que segura o estoque é o pedido `pending`.

## Opções comparadas

| Opção | Como funciona | Vantagem | Problema aqui |
|---|---|---|---|
| Lock pessimista | Na mesma transação, trava a linha do lote (`SELECT ... FOR UPDATE`), conta o estoque e grava o pedido | Fácil de explicar e de testar. O MySQL já faz o lock | A segunda requisição espera a primeira terminar |
| Update condicional | Um `UPDATE` só grava se ainda houver estoque (`WHERE reservado + pedido <= quantity`) | Não precisa travar a linha para leitura | Exige uma coluna de contador. Sem ela, o `UPDATE` não sabe o estoque |
| Contador | Uma coluna `reserved_count` sobe e desce a cada reserva e expiração | A leitura do estoque fica barata | A coluna pode divergir do que está em `orders` se uma atualização falhar |

## Decisão

Usar **lock pessimista** na linha de `ticket_lots`, dentro de uma transação do Prisma.

Passos de `POST /orders`:

1. Abrir uma transação.
2. Travar o lote com `SELECT ... FOR UPDATE`. Usar isolamento `READ COMMITTED` para que a leitura de estoque enxergue a reserva confirmada pela transação anterior depois da espera pelo lock.
3. Capturar o instante UTC após obter o lock e expirar pedidos `pending` com `expires_at <= agora` (RN-04, parte lazy), antes do cálculo de estoque.
4. Conferir se o lote está ativo e dentro da janela de venda (RN-02).
5. Somar as reservas `pending` não vencidas desse lote e itens de pedidos `paid`. Se a quantidade pedida não couber, responder `409 INSUFFICIENT_STOCK` (RN-03). Até a M06, pedidos pagos não são produzidos; ao integrar tickets, evitar contá-los duas vezes.
6. Gravar o pedido com `expires_at = agora + 15 minutos` e o item com `unit_price_snapshot` igual ao preço do lote naquele momento (RN-09).
7. Confirmar a transação.

A expiração também roda num **job** periódico, no processo da API, a cada minuto, para devolver o estoque mesmo quando ninguém cria um pedido novo. O job faz o mesmo update da etapa 3: `pending` vencido vira `expired`. Não apaga o pedido. O estoque exclui reservas vencidas pelo timestamp mesmo antes da próxima execução. O timer não inicia ao importar a aplicação nos testes e deve parar no encerramento do servidor.

## Escopo e validação

Cada requisição reserva um lote e uma quantidade positiva. Se houver suporte a múltiplos lotes futuramente, adquirir os locks em ordem crescente de ID. A janela de venda inclui ambos os limites; a expiração ocorre exatamente aos 15 minutos. Datas e preços usam os tipos existentes do projeto (UTC e Decimal).

O teste da #63 executará requisições HTTP paralelas contra MySQL real e conferirá o total persistido e os erros 409. A #64 verificará as bordas da janela, o instante de expiração e a reutilização do estoque. Falhas de gravação devem reverter pedido e itens juntos. A decisão é documental nesta issue; os experimentos executáveis pertencem às issues de implementação e testes.

## Consequências

- A reserva e a checagem de estoque acontecem juntas. Não fica janela entre "li o estoque" e "gravei o pedido".
- O preço do pedido não muda se o lote for reajustado depois.
- Reserva expirada deixa de entrar na soma, então o ingresso volta a ficar disponível.
- O job e a expiração lazy podem rodar ao mesmo tempo. Os dois só atualizam pedidos que ainda estão `pending` e vencidos, então repetir a operação não muda o resultado.
