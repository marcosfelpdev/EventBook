# Frontend do EventBook

SPA com React, TypeScript, Vite, Tailwind CSS, React Router e Axios.

O [README técnico](../README.md) contém o passo a passo para preparar banco, API, usuários de demonstração e interface.

## Desenvolvimento

Na pasta `frontend`, após preparar a API:

```powershell
npm ci
npm run dev
```

Acesse http://localhost:5173. A API padrão é http://localhost:3333. Para alterá-la, configure `VITE_API_URL` em `frontend/.env` e reinicie o Vite.

## Comandos

| Comando             | Uso                                           |
| ------------------- | --------------------------------------------- |
| `npm run dev`       | Servidor de desenvolvimento                   |
| `npm run lint`      | Verificação de lint                           |
| `npm run typecheck` | Verificação de tipos configurada pelo projeto |
| `npm test`          | Testes com Vitest e Testing Library           |
| `npm run build`     | Verificação TypeScript e build em `dist`      |
| `npm run preview`   | Inspeção local do build                       |

Rotas atuais: `/events`, `/events/:id`, `/login`, `/register`, `/dashboard` e o placeholder `/checkin`. Consulte as limitações do painel e do Nginx no README técnico.
