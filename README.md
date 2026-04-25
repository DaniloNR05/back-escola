# Porteirinha Joga Backend

API Node.js + Express do sistema Porteirinha Joga.

## Rodando localmente

```bash
npm install
npm run dev
```

API local:

- `http://localhost:3001`

## Variaveis de ambiente

Crie um arquivo `.env` com base no `.env.example`.

Exemplo:

```env
PORT=3001
CORS_ORIGIN=http://localhost:8080,https://seu-front.vercel.app
```

Descricao:

- `PORT`: porta da API
- `CORS_ORIGIN`: origens liberadas para acesso do frontend, separadas por virgula

## Deploy recomendado

### Render

Este repositorio ja inclui [render.yaml](file:///c:/Users/Danilo/Desktop/port/porteirinha-play-hub/backend/render.yaml) para facilitar o deploy.

Configuracao sugerida:

- Runtime: `Node`
- Build Command: `npm install`
- Start Command: `npm start`

Variaveis recomendadas:

- `PORT=10000`
- `CORS_ORIGIN=https://seu-front.vercel.app`

## Endpoints principais

- `GET /api/tournaments`
- `POST /api/tournaments`
- `GET /api/registrations`
- `POST /api/registrations`
- `POST /api/registrations/:id/athletes`
- `POST /api/auth/login`
