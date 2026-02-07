# Video Generator

Monorepo fullstack : **Express + MySQL + React (Vite)**

## Stack

| Package | Tech |
|---|---|
| `packages/api` | Express 5, Prisma, MySQL |
| `packages/web` | React 19, Vite, TypeScript |
| `packages/shared` | Types partagés API ↔ Web |

## Prérequis

- Node.js 20+
- pnpm 9+
- Docker (pour MySQL)

## Setup

```bash
# 1. Cloner et installer
pnpm install

# 2. Lancer MySQL
docker compose up -d

# 3. Configurer la DB
cp .env.example packages/api/.env
pnpm db:push
pnpm db:generate

# 4. Lancer le dev
pnpm dev
```

L'API tourne sur `http://localhost:3001` et le front sur `http://localhost:5173`.

## Scripts

| Commande | Description |
|---|---|
| `pnpm dev` | Lance API + Web en parallèle |
| `pnpm build` | Build tous les packages |
| `pnpm db:push` | Sync le schema Prisma → MySQL |
| `pnpm db:studio` | UI Prisma pour explorer la DB |
| `pnpm db:generate` | Regénère le client Prisma |

## Structure

```
video-generator/
├── packages/
│   ├── api/             # Backend Express
│   │   ├── prisma/      # Schema & migrations
│   │   └── src/
│   ├── web/             # Frontend React + Vite
│   │   └── src/
│   └── shared/          # Types partagés
│       └── src/
├── docker-compose.yml   # MySQL
├── turbo.json           # Turborepo config
└── pnpm-workspace.yaml
```
