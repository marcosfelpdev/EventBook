# Style Guide do EventBook

Padrão de código do projeto, baseado no [Airbnb JavaScript Style Guide](https://github.com/airbnb/javascript) e no Airbnb React/JSX Style Guide, adaptado para **TypeScript**, **Express + Prisma** e **React + Vite**.

**Regra de ouro:** consistência vale mais que preferência pessoal. Se o guia não cobre um caso, siga o código vizinho. Se o guia estiver errado, mude o guia por PR, não o código por conta própria.

## Sumário

1. [Como aplicamos o Airbnb](#1-como-aplicamos-o-airbnb)
2. [Ferramentas e configuração](#2-ferramentas-e-configuração)
3. [Formatação](#3-formatação)
4. [Nomenclatura](#4-nomenclatura)
5. [Organização de arquivos e módulos](#5-organização-de-arquivos-e-módulos)
6. [JavaScript moderno](#6-javascript-moderno)
7. [TypeScript](#7-typescript)
8. [Assincronismo e erros](#8-assincronismo-e-erros)
9. [API (Express)](#9-api-express)
10. [Banco de dados (Prisma)](#10-banco-de-dados-prisma)
11. [Testes](#11-testes)
12. [React](#12-react)
13. [Estilização (Tailwind)](#13-estilização-tailwind)
14. [Comentários](#14-comentários)
15. [Checklist de code review](#15-checklist-de-code-review)

---

## 1. Como aplicamos o Airbnb

O pacote oficial `eslint-config-airbnb` não acompanha o ESLint 9 (flat config) nem o TypeScript. Por isso o guia é adotado **como convenção**, e as regras principais são aplicadas por `typescript-eslint`, regras nativas do ESLint e Prettier (ver [seção 2](#2-ferramentas-e-configuração)).

### Onde divergimos do Airbnb (e por quê)

| # | Airbnb | EventBook | Motivo |
|---|---|---|---|
| 1 | Prefere `export default` quando há um único export | **Sempre `export` nomeado** | Facilita refatoração, busca e autoimport |
| 2 | Proíbe `import * as` | **Permitido** para fachadas de módulo (`import * as authService`) | Deixa claro de onde vem a função (`authService.login`) |
| 3 | Proíbe `for...of` e `await` em loop | **Permitido** `for...of` quando a ordem sequencial importa (seed, transações) | Alguns fluxos precisam ser sequenciais |
| 4 | Proíbe `_` no início de nomes | **Permitido** só em parâmetros não usados (`_req`, `_next`) | Padrão do Express |
| 5 | Prefere function expressions nomeadas | **Declarações de função** em services e componentes, **arrow** em handlers e callbacks | Melhor leitura e stack trace |
| 6 | Arquivo com o nome do export default | **`nome.camada.ts`** na API e **`PascalCase.tsx`** nos componentes | Identifica o papel do arquivo no módulo |
| 7 | PropTypes | **Interfaces TypeScript** para props | O tipo substitui a validação em runtime |

---

## 2. Ferramentas e configuração

O estilo é **verificado por máquina**. Se o lint e o Prettier passam, ninguém discute formatação em review.

### Prettier (`.prettierrc`)

```json
{
  "singleQuote": true,
  "semi": true,
  "trailingComma": "all",
  "printWidth": 100,
  "tabWidth": 2,
  "arrowParens": "always",
  "bracketSpacing": true,
  "endOfLine": "lf"
}
```

JSX usa aspas duplas nos atributos (padrão do Prettier e do Airbnb).

### ESLint da API (`api/eslint.config.mjs`)

```js
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';
import globals from 'globals';

export default tseslint.config(
  { ignores: ['dist', 'node_modules', 'coverage'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  prettier,
  {
    languageOptions: { globals: globals.node },
    rules: {
      // Variáveis e referências
      'no-var': 'error',
      'prefer-const': 'error',
      // Objetos, strings e funções
      'object-shorthand': 'error',
      'prefer-template': 'error',
      'prefer-arrow-callback': 'error',
      'prefer-destructuring': ['error', { object: true, array: false }],
      'no-param-reassign': ['error', { props: true, ignorePropertyModificationsFor: ['req', 'res'] }],
      // Comparação e fluxo
      eqeqeq: ['error', 'always'],
      curly: ['error', 'all'],
      'no-nested-ternary': 'error',
      'no-else-return': 'error',
      'no-lonely-if': 'error',
      'no-unneeded-ternary': 'error',
      'no-await-in-loop': 'warn',
      // Qualidade
      'no-console': ['warn', { allow: ['error', 'warn'] }],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
  {
    files: ['src/server.ts', 'prisma/seed.ts'],
    rules: { 'no-console': 'off' },
  },
);
```

No front-end, reaproveite a mesma lista de regras e some `eslint-plugin-react-hooks` e `eslint-plugin-jsx-a11y` (acessibilidade).

### Editor (`.editorconfig`)

```ini
root = true

[*]
indent_style = space
indent_size = 2
end_of_line = lf
charset = utf-8
trim_trailing_whitespace = true
insert_final_newline = true
```

### Quando roda

| Onde | O quê |
|---|---|
| Salvar no editor | Prettier (format on save) |
| Antes do commit (opcional) | `lint` e `format` |
| CI, toda PR | `lint`, `typecheck`, `build`, `test` |

---

## 3. Formatação

Tudo isto é aplicado pelo Prettier. Está aqui para você saber o que esperar.

- **Indentação:** 2 espaços. Nunca tabs.
- **Aspas:** simples em TS/JS (`'texto'`), duplas em atributos JSX (`className="card"`).
- **Ponto e vírgula:** sempre.
- **Vírgula final:** sempre em listas e objetos multilinha.
- **Largura:** 100 colunas.
- **Chaves:** sempre em `if`, `else`, `for` e `while`, mesmo com uma linha. Abertura na mesma linha.
- **Espaçamento:** um espaço antes de `{`, depois de `,` e entre operadores. Sem espaço dentro de parênteses.
- **Linhas em branco:** uma linha em branco entre blocos lógicos. Nunca duas seguidas. Nenhuma no início ou fim de um bloco.
- **Arquivo:** termina com uma quebra de linha.

```ts
// ✅
if (!user) {
  throw new AppError(401, 'UNAUTHENTICATED', 'Usuário não encontrado.');
}

// ❌
if (!user) throw new AppError(401, 'UNAUTHENTICATED', 'Usuário não encontrado.')
```

---

## 4. Nomenclatura

| Elemento | Padrão | Exemplo |
|---|---|---|
| Variável, parâmetro, função | `camelCase` | `remainingStock`, `calculateStock()` |
| Booleano | prefixo `is`, `has`, `can`, `should` | `isExpired`, `hasLots`, `canCancel` |
| Função que retorna booleano | mesmo prefixo | `isWithinCheckinWindow()` |
| Constante de valor fixo | `UPPER_SNAKE_CASE` | `RESERVATION_TTL_MINUTES = 15` |
| Classe | `PascalCase` | `AppError` |
| Interface e type | `PascalCase`, sem prefixo `I` | `TokenPayload`, `CreateOrderInput` |
| Enum (Prisma) | tipo `PascalCase`, valores `UPPER_SNAKE` | `Role.ORGANIZER` |
| Componente React | `PascalCase` | `CartSummary` |
| Hook | `camelCase` com prefixo `use` | `useCountdown` |
| Handler de evento (interno) | prefixo `handle` | `handleSubmit` |
| Prop de callback | prefixo `on` | `onChange` |
| Parâmetro não usado | prefixo `_` | `_req`, `_next` |
| Código de erro da API | `UPPER_SNAKE_CASE` | `INSUFFICIENT_STOCK` |
| Variável de ambiente | `UPPER_SNAKE_CASE` | `JWT_SECRET` |

### Regras gerais de nomes

- **Nomes em inglês** no código (variáveis, funções, tipos, rotas, tabelas). **Mensagens ao usuário, testes e documentação em português.**
- Nomes descritivos e pronunciáveis. Nada de abreviações obscuras (`ord`, `tmp`, `data2`). Aceitas: `id`, `req`, `res`, `env`, `tx`.
- Funções começam com **verbo** (`createOrder`, `expireOrders`). Valores começam com **substantivo** (`orderItems`).
- Evite negações em booleanos (`isNotValid`). Use `isValid`.
- Constantes mágicas ganham nome: `15 * 60 * 1000` vira `RESERVATION_TTL_MS`.

### Arquivos e pastas

| Tipo | Padrão | Exemplo |
|---|---|---|
| Módulo da API | `modulo.camada.ts` | `orders.service.ts`, `auth.routes.ts` |
| Pasta da API | `lowercase` | `modules/orders/` |
| Componente React | `PascalCase.tsx` | `CartSummary.tsx` |
| Hook | `useNome.ts` | `useCountdown.ts` |
| Chamadas HTTP do front | `nomeApi.ts` | `ordersApi.ts` |
| Teste | `nome.test.ts` | `orders.concurrency.test.ts` |
| Documentos | `kebab-case.md` | `regras-de-negocio.md` |

### API REST

- Recursos no **plural**, em inglês e `kebab-case`: `/events`, `/orders`.
- Hierarquia só quando há dependência real: `/events/:id/lots`.
- Ações que não são CRUD usam verbo no final: `POST /events/:id/publish`, `POST /orders/:id/checkout`.
- Payloads JSON em **`camelCase`**. Colunas do banco em **`snake_case`** (ver [seção 10](#10-banco-de-dados-prisma)).

---

## 5. Organização de arquivos e módulos

### Módulo de domínio da API

Cada módulo em `api/src/modules/<dominio>/` tem os mesmos arquivos:

| Arquivo | Responsabilidade | Pode | Não pode |
|---|---|---|---|
| `x.routes.ts` | Declarar rotas e encadear middlewares | Importar controller e middlewares | Conter lógica |
| `x.controller.ts` | Traduzir HTTP em chamada de service | Ler `req`, chamar service, enviar `res` | Acessar Prisma ou aplicar regra de negócio |
| `x.service.ts` | Regras de negócio e acesso ao banco | Usar Prisma, lançar `AppError` | Conhecer `req` ou `res` |
| `x.schemas.ts` | Schemas Zod e tipos de entrada | Definir validações | Conter lógica de negócio |

Regras críticas ficam em arquivo próprio (`stock.service.ts`, `checkout.service.ts`, `checkinWindow.ts`) para serem testadas e revisadas isoladamente.

### Regras de tamanho

- Um arquivo, uma responsabilidade.
- Função com mais de ~30 linhas: considere extrair.
- Arquivo com mais de ~250 linhas: considere dividir.
- Máximo de 3 parâmetros por função. Acima disso, use um objeto.

### Imports

Ordem, com uma linha em branco entre os grupos:

1. Pacotes externos (`express`, `zod`)
2. Aliases e módulos de outras camadas (`../../lib/prisma`)
3. Arquivos do mesmo módulo (`./auth.schemas`)
4. Imports de tipo (`import type`) junto do grupo de origem

```ts
import { Router } from 'express';

import { authenticate } from '../../middlewares/authenticate';
import { validate } from '../../middlewares/validate';

import * as controller from './auth.controller';
import { loginSchema, registerSchema } from './auth.schemas';
```

- Use `import type` para tipos.
- Sem imports circulares. Se dois módulos se precisam, extraia o que é comum.
- Sem importar de `dist/` ou de pastas internas de pacotes.

---

## 6. JavaScript moderno

Base: Airbnb JavaScript Style Guide.

### Variáveis

- `const` por padrão. `let` só quando houver reatribuição. **Nunca `var`.**
- Uma declaração por linha.

### Objetos e arrays

```ts
// ✅ shorthand, spread, desestruturação
const user = { id, name, role: 'BUYER' };
const updated = { ...user, name: 'Maria' };
const [first, ...rest] = lots;
const ids = lots.map((lot) => lot.id);

// ❌
const user = { id: id, name: name };
const copy = Object.assign({}, user);
```

- Literais (`{}`, `[]`), nunca `new Object()` ou `new Array()`.
- Chaves de objeto sem aspas, salvo quando necessárias.
- Prefira métodos de array (`map`, `filter`, `find`, `some`, `reduce`) a loops manuais.
- Não use `forEach` para transformar dados. Use `map`.
- Não mute argumentos. Retorne um novo valor.

### Strings

```ts
// ✅
const message = `Pedido ${order.id} expirou`;

// ❌
const message = 'Pedido ' + order.id + ' expirou';
```

### Funções

```ts
// ✅ parâmetros padrão e desestruturação
export async function listEvents({ page = 1, pageSize = 20 }: ListEventsInput = {}) {}

// ❌ reatribuir parâmetro
function add(total, value) {
  total = total + value;
}
```

- Não reatribua nem mute parâmetros (exceto `req`/`res` em middlewares).
- Arrow function para callbacks e handlers. Declaração de função para services, utilitários e componentes.
- Retorno antecipado (*early return*) em vez de `else` aninhado.

### Comparação e controle

- Sempre `===` e `!==`.
- **Sem ternário aninhado.** Use `if` ou uma função.
- Atalhos só para booleanos. Compare strings e números explicitamente.

```ts
// ✅
if (items.length > 0) {}
if (isExpired) {}

// ❌
if (items.length) {}
if (isExpired === true) {}
```

- Prefira optional chaining e nullish coalescing: `user?.name ?? 'Sem nome'`.

### Módulos

- Somente `export` nomeado.
- Sem `export default`, exceto onde a ferramenta exige (ex.: `vite.config.ts`).

---

## 7. TypeScript

- **`strict: true`** sempre ligado.
- **Proibido `any`.** Use tipo concreto, `unknown` com *narrowing* ou genéricos.
- Evite asserção de tipo (`as`). Aceita quando o tipo vem de uma biblioteca sem tipagem adequada, e com comentário.
- Evite o operador `!`. Única exceção: `req.user!` em rotas protegidas por `authenticate`.
- Anote o **retorno** de funções exportadas quando não for óbvio. Parâmetros sempre tipados.
- `interface` para formas de objeto e props. `type` para uniões, interseções e tipos derivados.
- Derive tipos de uma fonte única: `z.infer<typeof schema>` para entradas e tipos do Prisma para entidades.
- Prefira união de literais a `enum` próprio. Enums do banco vêm do Prisma (`Role`, `OrderStatus`).
- `null` para "sem valor" vindo do banco. `undefined` para "não informado".
- Nomes de genéricos descritivos quando houver mais de um (`TInput`, `TOutput`).

```ts
// ✅
export type CreateOrderInput = z.infer<typeof createOrderSchema>;

export async function createOrder(userId: number, input: CreateOrderInput): Promise<Order> {}

// ❌
export async function createOrder(userId: any, input: any) {}
```

---

## 8. Assincronismo e erros

### Assincronismo

- **`async/await`.** Sem correntes de `.then()`.
- Toda Promise é aguardada ou tratada. Sem *floating promises*.
- `Promise.all` para operações independentes. Aguarde em sequência quando a ordem ou a transação exigir.
- Express 5 encaminha rejeições de handlers `async` ao error handler, então **não use `try/catch` só para repassar o erro**.

### Erros

- Erros esperados do negócio são `AppError(status, code, message, details?)`.
- Nunca engula um erro (`catch {}` vazio). Trate, traduza ou relance.
- Mensagens ao usuário em português, sem detalhes internos.
- `console.error` apenas no error handler e na inicialização. Nada de `console.log` em código de produção.
- Códigos seguem o mapa de [convenções](convencoes.md#formato-padrão-de-erros-da-api).

```ts
// ✅ trata só o que sabe traduzir e relança o resto
try {
  return await prisma.user.create({ data, select: publicUser });
} catch (error) {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
    throw new AppError(409, 'EMAIL_ALREADY_EXISTS', 'E-mail já cadastrado.');
  }
  throw error;
}

// ❌
try {
  await doSomething();
} catch (e) {}
```

---

## 9. API (Express)

### Camadas

```ts
// routes: só declara
authRouter.post('/login', validate(loginSchema), controller.login);

// controller: traduz HTTP
export const login: RequestHandler = async (req, res) => {
  const result = await authService.login(req.body);
  res.json(result);
};

// service: regra de negócio
export async function login({ email, password }: LoginInput) {
  // ...
}
```

### Regras

- **Validação na borda:** todo payload passa por `validate(schema)` antes do controller.
- **Autorização em dois níveis:** `authorize(roles)` na rota e checagem de dono do recurso no service.
- **Nunca retorne `passwordHash`.** Use `select` explícito com os campos públicos.
- **Status HTTP corretos:** `201` na criação, `200` em consulta e atualização, `204` sem corpo, erros conforme o mapa de convenções.
- **Respostas diretas**, sem envelope, exceto listas paginadas.
- **Listas paginadas:** `{ "data": [], "page": 1, "pageSize": 20, "total": 120 }`.
- **Datas** em ISO 8601 UTC. **Dinheiro** como `Decimal` (string no JSON), nunca `number` com ponto flutuante.
- **Middlewares** são funções pequenas, com uma responsabilidade, e lançam `AppError` em vez de responder direto.
- **Configuração** vem só de `config/env.ts`. Nunca leia `process.env` fora dele.

---

## 10. Banco de dados (Prisma)

| Elemento | Padrão | Exemplo |
|---|---|---|
| Model | `PascalCase`, singular | `TicketLot` |
| Tabela (`@@map`) | `snake_case`, plural | `ticket_lots` |
| Campo | `camelCase` | `salesStartAt` |
| Coluna (`@map`) | `snake_case` | `sales_start_at` |
| Enum | `PascalCase`, valores `UPPER_SNAKE` | `OrderStatus.PENDING` |
| Migration | `verbo_objeto` | `create_orders`, `add_status_to_events` |

```prisma
model TicketLot {
  id           Int      @id @default(autoincrement())
  eventId      Int      @map("event_id")
  salesStartAt DateTime @map("sales_start_at")

  @@map("ticket_lots")
}
```

### Regras

- **Sempre `@map` e `@@map`**, para o código ficar em `camelCase` e o banco em `snake_case`.
- Toda restrição de negócio possível fica **no banco** (`@unique`, FK, índices), além do código. Exemplo: `unique` em `checkins.ticket_id`.
- Use `select` explícito. Não retorne a entidade inteira por padrão.
- Operações que precisam ser atômicas usam `prisma.$transaction` e passam o `tx` adiante.
- **SQL cru** só para agregações da RN-10 ou quando o Prisma não cobrir, com comentário explicando o motivo e sempre parametrizado (`$queryRaw` com template). Nunca concatene strings.
- Nunca edite uma migration já aplicada. Crie outra.
- Seed idempotente (`upsert`), sem segredos no código.

```ts
// Transação: o tx é passado para as funções internas
return prisma.$transaction(async (tx) => {
  // RN-03: verificar e reservar o estoque na mesma transação
  const remaining = await getRemainingStock(tx, lotId);
  // ...
});
```

---

## 11. Testes

### Estrutura

- Testes de integração da API em `api/tests/integration/<tema>.test.ts`.
- Testes de componente ao lado do componente ou em `web/src/**/__tests__/`.
- E2E em `e2e/tests/`.

### Padrão

- `describe` por rota ou regra. `it` descreve **um comportamento**, em português, começando por verbo.
- Estrutura **Arrange → Act → Assert**, separada por linhas em branco.
- Um assunto por `it`. Teste não tem `if` nem loop.
- Testes **independentes**: cada um monta seus dados e limpa o banco em `beforeEach`.
- Sem `setTimeout` ou espera fixa. Controle o tempo explicitamente (datas passadas por parâmetro ou relógio simulado).
- Regras de negócio citam a RN no `describe`: `describe('RN-06: prazo de cancelamento', ...)`.
- Para cada regra com janela de horário, teste as **bordas exatas** (11h59 e 12h00).
- Mock só de fronteiras externas (gateway de pagamento). Nunca mocke o banco nos testes de integração.

```ts
describe('POST /register', () => {
  it('cadastra o usuário como BUYER e não expõe o hash', async () => {
    const res = await request(app).post('/register').send(validUser);

    expect(res.status).toBe(201);
    expect(res.body.role).toBe('BUYER');
    expect(res.body).not.toHaveProperty('passwordHash');
  });
});
```

---

## 12. React

Base: Airbnb React/JSX Style Guide.

### Componentes

- **Somente componentes de função.** Sem classes.
- **Um componente por arquivo**, com o mesmo nome do arquivo.
- Declaração de função e `export` nomeado.
- Props tipadas com interface `NomeProps`, desestruturadas na assinatura.
- Componente pequeno e focado. Passou de ~150 linhas, divida.
- Lógica de dados em **hooks** (`useEvents`). Chamadas HTTP em `features/<x>/<x>Api.ts`. O componente não chama Axios direto.

```tsx
interface QuantitySelectorProps {
  value: number;
  max: number;
  onChange: (quantity: number) => void;
}

export function QuantitySelector({ value, max, onChange }: QuantitySelectorProps) {
  const canIncrease = value < max;

  return (
    <div className="flex items-center gap-2">
      <button type="button" onClick={() => onChange(value - 1)} disabled={value <= 0}>
        -
      </button>
      <span>{value}</span>
      <button type="button" onClick={() => onChange(value + 1)} disabled={!canIncrease}>
        +
      </button>
    </div>
  );
}
```

### JSX

- Atributos com aspas **duplas**. Expressões entre chaves.
- Tag sem filhos é auto-fechada: `<Loading />`.
- Booleano verdadeiro sem valor: `<Input disabled />`.
- Props multilinha: uma por linha, com `>` na linha seguinte se necessário (o Prettier cuida).
- **`key` estável** (id do registro). Nunca o índice do array em listas que mudam.
- Não use `dangerouslySetInnerHTML`.
- Sem funções complexas inline no JSX. Extraia para um `handleX`.

### Estados de interface (obrigatório pela Definition of Done)

Todo componente que carrega dados trata **os quatro estados**, nesta ordem, com *early return*:

```tsx
if (isLoading) {
  return <Loading />;
}
if (error) {
  return <ErrorState error={error} />;
}
if (events.length === 0) {
  return <EmptyState message="Nenhum evento disponível." />;
}

return <EventList events={events} />;
```

### Hooks e estado

- Hooks só no topo do componente ou de outro hook, nunca em condição ou loop (`react-hooks/rules-of-hooks`).
- Dependências de `useEffect` completas (`react-hooks/exhaustive-deps`).
- Estado mínimo: não guarde em `useState` o que pode ser calculado a partir de outro estado ou de props.
- Estado global apenas para o que é realmente global (`AuthContext`). O resto fica local.

### Acessibilidade

- `button` para ação, `a` para navegação. Nunca `div` clicável.
- Todo `input` com `label`. Toda `img` com `alt`.
- Mensagens de erro de formulário associadas ao campo.

### Pastas do front-end

```
web/src/
├── components/    # genéricos e reutilizáveis (ui/, layouts)
├── features/      # por domínio: componentes, hooks e api de cada feature
├── pages/         # uma por rota
├── contexts/      # contextos globais
├── services/      # cliente HTTP configurado (api.ts)
└── routes/        # definição de rotas
```

---

## 13. Estilização (Tailwind)

- **Classes utilitárias no JSX.** Sem `style={{}}` inline, salvo valores dinâmicos que o Tailwind não cobre.
- Estilo repetido vira **componente**, não `@apply`.
- Cores, espaçamentos e fontes vêm do **tema do Tailwind**. Sem valores arbitrários (`w-[437px]`) sem justificativa.
- Classes condicionais montadas com função auxiliar, nunca por concatenação de strings soltas.
- Ordem das classes: layout → espaçamento → tipografia → cor → estado. (Recomendado: `prettier-plugin-tailwindcss` para ordenar automaticamente.)
- Layout **mobile-first**: classes base para telas pequenas e prefixos (`md:`, `lg:`) para as maiores.

---

## 14. Comentários

- Comente o **porquê**, não o quê. Se o código precisa explicar o quê, renomeie ou extraia.
- Referencie a regra de negócio onde ela é aplicada: `// RN-04: expira reservas vencidas antes de calcular o estoque`.
- `/** ... */` para documentar funções públicas de service cujo contrato não é óbvio. `//` para o resto, com uma linha em branco antes.
- **Sem código comentado.** O Git guarda o histórico.
- Pendências com a issue: `// TODO(#123): descrição`. TODO sem issue não passa em review.
- Desativar lint exige comentário com o motivo: `// eslint-disable-next-line ... -- motivo`.

---

## 15. Checklist de code review

**Estilo**
- [ ] `lint`, `format` e `typecheck` passam
- [ ] Nomes seguem a [seção 4](#4-nomenclatura)
- [ ] Sem `any`, `var`, `console.log`, código comentado ou TODO sem issue

**Arquitetura**
- [ ] Cada camada faz só o seu papel (rota, controller, service, schema)
- [ ] Entrada validada com Zod na borda
- [ ] Autorização por perfil **e** por recurso, quando aplicável
- [ ] Nenhum campo sensível na resposta

**Regras e dados**
- [ ] RN citada no código e coberta por teste, incluindo bordas
- [ ] Operações atômicas dentro de transação
- [ ] Restrições relevantes também no banco
- [ ] Datas em UTC e dinheiro como `Decimal`

**Front-end**
- [ ] Estados de loading, vazio e erro tratados
- [ ] Sem chamada HTTP direta no componente
- [ ] Acessibilidade básica (labels, `alt`, elementos semânticos)

**Processo**
- [ ] PR pequena, ligada à issue, com CI verde
- [ ] Documentação atualizada quando houve mudança de regra ou contrato
