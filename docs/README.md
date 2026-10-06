# EventBook

Plataforma de venda de ingressos para eventos. Organizadores criam eventos e lotes, compradores reservam e pagam (checkout simulado), e a equipe valida a entrada por check-in, tudo com proteção contra overselling e regras de negócio documentadas.

## Stack

| Camada | Tecnologias |
|---|---|
| API | Node.js, TypeScript, Express, Zod, JWT |
| Banco | MySQL 8, Prisma ORM |
| Front-end | React, Vite, TypeScript, Tailwind CSS |
| Testes | Vitest, Supertest, Testing Library, Playwright (E2E) |
| Infra | Docker, Docker Compose, GitHub Actions |

## Estrutura

```
eventbook/
├── api/    # Back-end (Express + Prisma)
├── web/    # Front-end (React + Vite)
├── docs/   # Regras de negócio, ERD, perfis, convenções, ADRs
└── .github/
```

## Documentação

- [Regras de negócio (RN-01 a RN-10)](docs/regras-de-negocio.md)
- [Modelo de dados (ERD)](docs/erd.md)
- [Perfis e permissões](docs/perfis-e-permissoes.md)
- [Convenções do projeto](docs/convencoes.md)

## Pré-requisitos

- Node.js 22 LTS ou superior (`node -v`)
- npm 10+ (`npm -v`)
- Docker e Docker Compose (`docker --version` e `docker compose version`)
- Git

## Setup do ambiente (M01)

### 1. Estrutura inicial

```bash
mkdir eventbook && cd eventbook
git init
mkdir api web docs
```

### 2. API

```bash
cd api
npm init -y

# Dependências de produção
npm install express dotenv zod

# Dependências de desenvolvimento
npm install -D typescript@~5.9 tsx @types/node @types/express

# Lint e formatação
npm install -D eslint @eslint/js typescript-eslint globals prettier eslint-config-prettier

# Prisma (versão 6) e cliente
npm install @prisma/client@6
npm install -D prisma@6
npx prisma init --datasource-provider mysql

# Testes
npm install -D vitest supertest @types/supertest

# TypeScript
npx tsc --init
```

Scripts do `api/package.json`:

```json
"scripts": {
  "dev": "tsx watch src/server.ts",
  "build": "tsc",
  "start": "node dist/server.js",
  "typecheck": "tsc --noEmit",
  "lint": "eslint .",
  "format": "prettier --write .",
  "test": "vitest run"
}
```

`tsconfig.json` (opções principais):

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "rootDir": "src",
    "outDir": "dist",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  },
  "include": ["src"]
}
```

`eslint.config.mjs`:

```js
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';
import globals from 'globals';

export default tseslint.config(
  { ignores: ['dist', 'node_modules'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  prettier,
  { languageOptions: { globals: globals.node } },
);
```

> **Nota:** o TypeScript está fixado em `~5.9` porque o `typescript-eslint` ainda não aceita o TypeScript 7 (peer dependency `<6.1.0`). Atualize a fixação quando o `typescript-eslint` passar a suportar versões mais novas.

### 3. Front-end

```bash
cd ../web
npm create vite@latest . -- --template react-ts
npm install
npm install -D typescript@~5.9   # compatível com typescript-eslint

# Estilização (Tailwind CSS)
npm install tailwindcss @tailwindcss/vite

# Formatação (o Vite já traz o ESLint configurado)
npm install -D prettier eslint-config-prettier

# Testes
npm install -D vitest jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event
```

Para ativar o Tailwind, adicione o plugin em `vite.config.ts` (`import tailwindcss from '@tailwindcss/vite'` e `plugins: [react(), tailwindcss()]`) e coloque `@import "tailwindcss";` no `src/index.css`.

### 4. Banco de dados com Docker

```bash
cd ..
cp .env.example .env
docker compose up -d mysql
```

Variáveis principais do `.env.example`:

```
MYSQL_ROOT_PASSWORD=change-me
MYSQL_DATABASE=eventbook
DATABASE_URL="mysql://root:change-me@localhost:3306/eventbook"
PORT=3333
```

### 5. Verificação

```bash
cd api && npm run lint && npm run typecheck && npm test
cd ../web && npm run lint && npm run build
```

## Milestones

| Milestone | Escopo |
|---|---|
| M01 | Fundação, infraestrutura, CI e testes |
| M02 | Autenticação e perfis (RBAC) |
| M03 | Gestão de eventos |
| M04 | Lotes e capacidade |
| M05 | Pedido e reserva temporária |
| M06 | Checkout atômico e cancelamento |
| M07 | Staff e check-in |
| M08 | Ocupação |
| M09 | Hardening e release |

## Contribuindo

Siga o fluxo `Issue → Branch → Commit → PR → Review → Merge` descrito em [convenções](docs/convencoes.md). Esta documentação evolui junto com o código: toda mudança de regra ou de contrato atualiza os documentos em `docs/`.
