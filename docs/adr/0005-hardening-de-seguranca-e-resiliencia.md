# ADR 0005: Hardening de Segurança, CORS Estrito e Proteção contra Força Bruta

**Status:** aceita  
**Issues:** #88, #89, #90, #91, #93 (M09)  
**Regras:** Hardening, Segurança e Release

## Contexto

Antes da disponibilização pública da plataforma (Release v1.0.0), a aplicação precisa garantir defesas essenciais contra ataques comuns da Web (clickjacking, MIME sniffing, injeção de cabeçalhos, requisições de origens não autorizadas e ataques de força bruta ou credenciais em lote).

## Decisão

1. **Helmet HTTP Headers:**
   - Integração do middleware `helmet` no pipeline Express (`backend/src/app.ts`).
   - Define cabeçalhos de segurança padrão: `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, `X-DNS-Prefetch-Control: off`, entre outros.
   - Configurado `crossOriginResourcePolicy: false` para permitir o consumo dos endpoints REST por clientes web decoupling.

2. **CORS com Lista de Permissão Restrita:**
   - O CORS é restrito a origens confiáveis (`http://localhost:5173`, `http://127.0.0.1:5173`, `process.env.FRONTEND_URL`).
   - Requisições originadas de domínios maliciosos ou não cadastrados são rejeitadas com status `403 FORBIDDEN` e payload estruturado `{ code: 'FORBIDDEN', message: 'Origem não permitida pela política de CORS.' }`.

3. **Rate Limiting nas Rotas Sensíveis:**
   - Utilização de `express-rate-limit` para restringir chamadas em `/register` e `/login` a 30 requisições por janela de 15 minutos por IP em ambientes de produção/desenvolvimento.
   - Em caso de estouro de cota, o servidor responde com código `429 TOO_MANY_REQUESTS` e orientações de espera.
   - Limite relaxado automaticamente em ambiente de teste (`process.env.NODE_ENV === 'test'`) para viabilizar testes de integração de alta velocidade.

4. **Auditoria de Resiliência de UI e E2E:**
   - A camada de cliente (`frontend/src/services/api.ts`) padroniza o tratamento de erros HTTP (400, 401, 403, 404, 409, 422, 429 e 500).
   - Teste de ponta a ponta com Playwright validando a esteira completa: cadastro, compra, checkout e check-in.

## Consequências

- Superfície de ataque reduzida drasticamente.
- Prevenção ativa de tentativas de brute force em contas de usuários e administradores.
- Conformidade com as boas práticas de segurança OWASP para APIs REST.
