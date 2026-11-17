# ADR 0004: Agregação SQL Nativa para Métricas de Ocupação e Receita

**Status:** aceita  
**Issues:** #83, #84, #85, #86, #87, #117 (M08)  
**Regras:** RN-10

## Contexto

Organizadores e administradores precisam monitorar o desempenho de vendas e a taxa de ocupação dos eventos em tempo real.
Trazer todos os pedidos e itens para processamento em memória no Node.js cria gargalos de rede, latência desnecessária e consumo elevado de memória em eventos de grande escala (com milhares de ingressos).

## Decisão

1. **Agregação SQL Nativa no MySQL:**
   - O cálculo das métricas de ocupação é realizado diretamente no banco através de consultas com funções de agregação (`SUM`, `COUNT`, `COALESCE`) filtrando pedidos com status `PAID` e `PENDING` (não expirados).
   - Ingressos cancelados e reservas expiradas são explicitamente excluídos dos somatórios.
   - A taxa de ocupação percentual é computada sobre a capacidade total configurada no evento:
     $$\text{taxaDeOcupacao} = \min\left(100, \frac{\text{totalEmitidoOuReservado}}{\text{capacidadeTotal}} \times 100\right)$$
   - A receita total faturada agrega exclusivamente pedidos `PAID`:
     $$\text{receitaTotal} = \sum (\text{itens de pedidos pagos} \times \text{unitPriceSnapshot})$$

2. **Segurança de Acesso:**
   - O endpoint `GET /events/:id/occupancy` restringe a consulta exclusivamente ao organizador proprietário do evento (`organizerId`) e administradores do sistema (`role === 'ADMIN'`).

## Consequências

- Consultas com tempo de resposta sub-milissegundo mesmo com milhares de pedidos registrados.
- Integridade garantida da métrica sem divergências entre o total do painel e o faturamento real.
