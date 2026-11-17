# ADR 0002: Checkout Atômico e Cancelamento com Janela de Antecedência

**Status:** aceita  
**Issues:** #66, #67, #68, #71, #72, #75, #76 (M06)  
**Regras:** RN-05 e RN-06

## Contexto

A plataforma necessita processar o pagamento de pedidos reservados (`PENDING`) e transformá-los em pedidos pagos (`PAID`), emitindo ingressos (`tickets`) com códigos alfanuméricos únicos.
Caso ocorra qualquer falha durante o processamento do gateway ou gravação no banco, nenhuma alteração parcial pode permanecer.
Adicionalmente, compradores têm direito ao cancelamento de pedidos. Para pedidos pagos, o cancelamento só pode ocorrer se houver antecedência mínima de 12 horas antes do início do evento (`startsAt`), invalidando os ingressos emitidos e liberando o estoque.

## Decisão

1. **Checkout Atômico (RN-05):**
   - Execução integral encapsulada em transação de banco de dados (`prisma.$transaction`).
   - Simulação de gateway de pagamento com suporte a métodos (`CREDIT_CARD`, `PIX`, `BOLETO`).
   - Geração de ingressos individuais correspondentes à quantidade de itens adquiridos com código padronizado e aleatório `EB-{UUID-PREFIX}`.
   - Rollback automático em caso de exceção no gateway ou persistência: nenhum ingresso é emitido e o pedido permanece inalterado.

2. **Cancelamento com Validação Temporal (RN-06):**
   - Para pedidos `PENDING`, cancelamento imediato sem restrição de prazo prévio.
   - Para pedidos `PAID`, verificação: `event.startsAt.getTime() - now.getTime() >= 12 * 60 * 60 * 1000`.
   - Se faltarem menos de 12 horas, retorno de `422 CANCELLATION_WINDOW_CLOSED`.
   - Na confirmação, o pedido recebe status `CANCELLED`, todos os ingressos associados recebem status `CANCELLED` e o estoque correspondente é liberado no cálculo dinâmico.

## Consequências

- Garantia matemática de que nenhum pedido tem status `PAID` sem ingressos válidos correspondentes.
- Prevenção de prejuízo financeiro e desorganização de lotação para produtores de eventos ao restringir cancelamentos de última hora.
