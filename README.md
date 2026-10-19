# EventBook

Aplicação web de gestão e venda de ingressos, com frontend React e API REST Express. O objetivo é oferecer eventos, lotes, reservas temporárias, checkout simulado e check-in com consistência de estoque.

## Estado atual

Disponível: cadastro, login, autenticação JWT, autorização por perfil, vitrine paginada com busca, detalhe, criação e edição de eventos e painel inicial do organizador. O banco possui usuários e eventos, migrations e dados de demonstração.

Ainda planejado: lotes, publicação com validação de lotes, pedidos, reservas de 15 minutos, proteção contra overselling, pagamento simulado, ingressos, cancelamentos, gestão de staff, check-in e ocupação. A rota de check-in contém apenas um título. O fluxo completo de compra ainda não está disponível.

O planejamento detalhado está no [backlog](context/backlog-eventbook.md). M01 a M03 estão marcadas como concluídas nesse documento; M04 a M09 permanecem pendentes. Essa marcação não substitui a validação das limitações descritas abaixo.

## Pré-requisitos

- Git.
- Node.js 22.22.2 ou superior na linha 22 LTS e npm. Algumas dependências de teste exigem essa atualização mínima da linha 22.
- Docker Desktop iniciado, com suporte a contêineres Linux e Docker Compose.
- Portas locais 3306 (MySQL), 3333 (API) e 5173 (frontend) disponíveis.

Os comandos abaixo usam PowerShell. Se a política de execução bloquear `npm.ps1` ou `npx.ps1`, utilize `npm.cmd` e `npx.cmd`, respectivamente.

## Executar em desenvolvimento

### 1. Obter o código e iniciar o banco

```powershell
git clone https://github.com/marcosfelpdev/EventBook.git
cd EventBook
docker compose up -d mysql
docker compose ps
docker compose logs --tail 30 mysql
```

Aguarde o MySQL ficar saudável antes das migrations. O Compose cria o banco `eventbook` e mantém seus dados no volume `mysql_data`.

### 2. Preparar e iniciar a API

```powershell
cd backend
Copy-Item .env.example .env
npm ci
npx prisma migrate deploy
npm run db:seed
npm run dev
```

Execute a cópia de `.env.example` apenas na primeira configuração, para preservar um `.env` já ajustado. `npm ci` instala as dependências do lockfile e executa a geração do Prisma Client. `migrate deploy` aplica as migrations versionadas; para criar uma nova migration durante o desenvolvimento, use `npx prisma migrate dev --name descricao`.

### 3. Iniciar o frontend

Em outro terminal, a partir da raiz do repositório:

```powershell
cd frontend
npm ci
npm run dev
```

| Serviço     | Endereço                     |
| ----------- | ---------------------------- |
| Interface   | http://localhost:5173        |
| API         | http://localhost:3333        |
| Healthcheck | http://localhost:3333/health |
| MySQL       | localhost:3306               |

### 4. Explorar a aplicação

Abra `/events` para a vitrine, `/register` para cadastro, `/login` para autenticação e `/dashboard` para o painel do organizador. Todo cadastro público cria um `BUYER`.

O seed cria os seguintes usuários, todos com a senha definida em `backend/.env` por `SEED_PASSWORD`:

| Perfil    | E-mail                   |
| --------- | ------------------------ |
| ADMIN     | admin@eventbook.test     |
| ORGANIZER | organizer@eventbook.test |
| STAFF     | staff@eventbook.test     |
| BUYER     | buyer@eventbook.test     |

O seed também cria quatro eventos: dois publicados (um passado), um rascunho e um cancelado. Reexecutá-lo atualiza as contas de demonstração, suas senhas e as datas dos eventos correspondentes.

## Configuração

| Variável         | Onde configurar          | Uso / valor local de exemplo                 |
| ---------------- | ------------------------ | -------------------------------------------- |
| `DATABASE_URL`   | `backend/.env`           | `mysql://root:root@localhost:3306/eventbook` |
| `PORT`           | `backend/.env`           | Porta da API; padrão `3333`                  |
| `NODE_ENV`       | `backend/.env`           | `development`, `test` ou `production`        |
| `JWT_SECRET`     | `backend/.env`           | Chave usada para assinar e validar tokens    |
| `JWT_EXPIRES_IN` | `backend/.env`           | Validade do token; padrão `1d`               |
| `SEED_PASSWORD`  | `backend/.env`           | Senha das contas de demonstração             |
| `VITE_API_URL`   | `frontend/.env` opcional | URL da API; padrão `http://localhost:3333`   |

Os valores dos arquivos de exemplo destinam-se ao desenvolvimento. Ajuste as credenciais para outros ambientes e mantenha `.env` fora do versionamento. Reinicie o Vite após alterar sua configuração; variáveis `VITE_*` são incorporadas ao build.

O `.env` da raiz atende à interpolação do Docker Compose. Ele não substitui `backend/.env`. No Compose atual, usuário, senha e nome do banco MySQL estão definidos diretamente no YAML.

## API disponível

As rotas não possuem prefixo `/api`. Para autenticar requisições, envie `Authorization: Bearer <token>` com o token retornado por `/login`.

| Método | Rota          | Acesso e comportamento                                              |
| ------ | ------------- | ------------------------------------------------------------------- |
| GET    | `/health`     | Público; retorna `{ "status": "ok" }`                               |
| POST   | `/register`   | Público; cria BUYER, retorna usuário sem hash e status 201          |
| POST   | `/login`      | Público; retorna `{ token, user }`                                  |
| GET    | `/me`         | Autenticado; retorna o próprio usuário sem hash                     |
| GET    | `/events`     | Público; somente publicados, incluindo eventos passados             |
| GET    | `/events/:id` | Público para publicados; dono ou ADMIN também acessa não publicados |
| POST   | `/events`     | ORGANIZER ou ADMIN; cria evento DRAFT, retorna 201                  |
| PATCH  | `/events/:id` | Organizador dono ou ADMIN; bloqueia edição de evento já iniciado    |

`GET /events` aceita `page` (padrão 1), `pageSize` (padrão 20, máximo 100) e `search` (título ou local). Retorna `{ data, page, pageSize, total }`, ordenado pelo início do evento.

### Exemplos em PowerShell

```powershell
Invoke-RestMethod http://localhost:3333/health
Invoke-RestMethod 'http://localhost:3333/events?page=1&pageSize=10&search=Festival'

$credentials = @{
  email = 'organizer@eventbook.test'
  password = 'SUA_SEED_PASSWORD'
} | ConvertTo-Json
$session = Invoke-RestMethod http://localhost:3333/login -Method Post -ContentType 'application/json' -Body $credentials
$headers = @{ Authorization = "Bearer $($session.token)" }
Invoke-RestMethod http://localhost:3333/me -Headers $headers

$eventBody = @{
  title = 'Encontro de tecnologia'
  description = 'Encontro para compartilhar experiências de desenvolvimento.'
  location = 'Centro de eventos'
  capacity = 100
  startsAt = (Get-Date).ToUniversalTime().AddDays(7).ToString('yyyy-MM-ddTHH:mm:ssZ')
  endsAt = (Get-Date).ToUniversalTime().AddDays(7).AddHours(3).ToString('yyyy-MM-ddTHH:mm:ssZ')
} | ConvertTo-Json
$event = Invoke-RestMethod http://localhost:3333/events -Method Post -Headers $headers -ContentType 'application/json' -Body $eventBody
Invoke-RestMethod "http://localhost:3333/events/$($event.id)" -Headers $headers
```

Cadastro recebe `name` (mínimo 3 caracteres), `email` e `password` (mínimo 6). Criação de evento recebe `title` (mínimo 3), `description` (mínimo 10), `location` (mínimo 3), `capacity` (inteiro positivo), `startsAt` e `endsAt` em ISO 8601 UTC. O início deve ser futuro e o término posterior ao início. O PATCH aceita esses campos opcionais e `status`.

Erros seguem `{ code, message, details? }`. As respostas utilizam 400 para validação, 401 para autenticação, 403 para autorização, 404 para recurso não encontrado, 409 para conflito, 422 para regra de negócio e 500 para falha inesperada. Exemplos atuais: `EMAIL_ALREADY_EXISTS`, `INVALID_CREDENTIALS`, `EVENT_NOT_FOUND` e `EVENT_ALREADY_STARTED`.

## Arquitetura e decisões

```mermaid
flowchart LR
    UI[React / Vite] -->|HTTP JSON + JWT| API[Express]
    API --> MW[Autenticação, RBAC e validação Zod]
    MW --> CT[Controllers]
    CT --> SV[Services]
    SV --> ORM[Prisma]
    ORM --> DB[(MySQL 8)]
```

- **Monorepo:** frontend e backend possuem dependências, scripts e builds independentes; Compose provê o ambiente local.
- **React, Vite e Tailwind CSS:** SPA com React Router, contexto de autenticação e Axios. O cliente envia o token automaticamente; a sessão é persistida em localStorage.
- **Express e TypeScript strict:** API organizada por camadas em `routes`, `controllers`, `services`, `schemas` e `middlewares`. Controllers tratam HTTP; services concentram regras e acesso ao Prisma.
- **MySQL 8 e Prisma 6:** modelo relacional com migrations versionadas. Atualmente existem apenas `User` e `Event`; o restante do [ERD](docs/erd.md) é planejamento. Transações de estoque e checkout ainda serão implementadas.
- **JWT e bcryptjs:** tokens autenticam a API, perfis controlam o acesso e services verificam propriedade dos eventos. Senhas são armazenadas como hash.
- **Zod e erros centralizados:** schemas validam entradas; o middleware global apresenta erros da aplicação em JSON.
- **Datas em UTC:** a API recebe datas ISO 8601; a interface apresenta horários ao usuário. As regras temporais planejadas estão nas [regras de negócio](docs/regras-de-negocio.md).
- **Pagamento simulado:** gateway real, PIX real e cobrança de cartão não fazem parte do escopo previsto.

Estas decisões descrevem o código atual. As decisões de concorrência e expiração ainda precisam de ADR; este README não substitui esse trabalho.

## Verificação, testes e build

Em cada pasta (`backend` e `frontend`), execute:

```powershell
npm run lint
npm run typecheck
npm test
npm run build
```

O GitHub Actions configura jobs de lint, typecheck, testes e build para as duas aplicações. O backend utiliza Vitest e Supertest; os testes atuais de autenticação e eventos simulam o Prisma, sem comprovar integração com MySQL real. O frontend possui Vitest, jsdom e Testing Library. Testes de concorrência, rollback de checkout e E2E com Playwright são pendentes.

Após o build, `npm start` em `backend` executa `dist/server.js`; `npm run preview` em `frontend` permite inspecionar o build da interface localmente.

## Docker Compose completo

Além do banco, há serviços de backend e frontend. A API não executa migrations nem seed automaticamente no seu comando de inicialização. Para preparar um banco novo com os serviços em contêineres, a partir da raiz:

```powershell
docker compose up -d mysql
# Aguarde o banco ficar saudável.
docker compose build backend frontend
docker compose run --rm backend npx prisma migrate deploy
docker compose run --rm backend npm run db:seed
docker compose up -d backend frontend
```

O frontend usa Nginx na porta 5173 e a API fica na 3333. O build atual utiliza a URL padrão da API no navegador (`localhost:3333`). O Nginx ainda não possui configuração de fallback para rotas da SPA; acesso direto ou atualização em `/events` ou `/dashboard` pode retornar 404. Para desenvolvimento, prefira o Vite conforme o passo a passo anterior.

Para parar os serviços locais, use `Ctrl+C` nos terminais de desenvolvimento e `docker compose stop` para o banco. `docker compose down` remove contêineres e rede, preservando o volume por padrão.

## Limitações conhecidas

- O painel consulta a vitrine pública, então ainda não lista os próprios rascunhos e eventos cancelados.
- O PATCH aceita alteração direta para `PUBLISHED`, sem validação de lotes. A publicação exigida pela RN-01 ainda está pendente.
- O código concede acesso a ADMIN além do previsto na matriz documentada; é necessário alinhar implementação e especificação.
- O erro de edição de evento passado é `EVENT_ALREADY_STARTED`; a especificação prevê `EVENT_IN_PAST`.
- A edição parcial ainda precisa validar datas contra os valores já persistidos quando apenas uma delas é enviada.
- Helmet, CORS restrito, rate limit, OpenAPI e E2E fazem parte da M09 e ainda não estão implementados.

## Solução de problemas

| Sintoma                            | Conferir                                                                        |
| ---------------------------------- | ------------------------------------------------------------------------------- |
| Docker não conecta                 | Inicie o Docker Desktop e aguarde o engine Linux ficar disponível               |
| Falha de conexão nas migrations    | Aguarde o healthcheck do MySQL; confira porta 3306 e `DATABASE_URL`             |
| API responde 500 ao listar eventos | Confira o banco e execute as migrations antes do seed                           |
| `vite` ou `tsx` não encontrado     | Execute `npm ci` na pasta correspondente e aguarde finalizar                    |
| Aviso de engine do jsdom           | Atualize o Node para pelo menos 22.22.2 na linha 22                             |
| Interface não acessa a API         | Confira a API na porta 3333 e `VITE_API_URL`; reinicie o Vite se alterar `.env` |

## Estrutura e documentação

```text
backend/
  prisma/             # schema, migrations e seed
  src/                # API por camadas
  tests/              # testes HTTP e de regras atuais
frontend/
  src/                # páginas, componentes, contexto, hooks e serviços
docs/                 # regras, ERD, permissões e convenções
context/              # backlog e guia de estilo
.github/              # CI, templates e CODEOWNERS
```

- [Regras de negócio](docs/regras-de-negocio.md)
- [Modelo de dados planejado](docs/erd.md)
- [Perfis e permissões previstos](docs/perfis-e-permissoes.md)
- [Convenções de contribuição](docs/convencoes.md)
- [Guia de estilo](context/style-guide.md)
- [Backlog por milestone](context/backlog-eventbook.md)

Contribuições seguem `Issue → Branch → Commit → PR → Review → Merge`, com Conventional Commits, CI verde e pelo menos uma aprovação. Exemplo de branch: `docs/92-readme-tecnico`.
