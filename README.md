# Video Generator

Monorepo fullstack : **Express + PostgreSQL + React (Vite)**

## Stack

| Package | Tech |
|---|---|
| `packages/api` | Express 5, Prisma, PostgreSQL |
| `packages/web` | React 19, Vite, TypeScript |
| `packages/shared` | Types partagés API ↔ Web |

## Prérequis

- Node.js 20+
- pnpm 9+
- PostgreSQL (via PostgreSQL Workbench ou autre)

## Setup

```bash
# 1. Installer les dépendances
pnpm install

# 2. Configurer la connexion PostgreSQL
cp .env.example packages/api/.env
# Éditer packages/api/.env avec tes identifiants PostgreSQL

# 3. Créer les tables
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
| `pnpm db:push` | Sync le schema Prisma → PostgreSQL |
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
├── turbo.json           # Turborepo config
└── pnpm-workspace.yaml
```
