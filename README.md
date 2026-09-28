# PadosiPro

A full-stack mobile application for local service professionals to manage their tasks and profiles.

## Tech Stack

| Layer    | Technology                                          |
| -------- | --------------------------------------------------- |
| Mobile   | React Native (Expo, TypeScript)                     |
| Backend  | Node.js, Express, TypeScript                        |
| Database | PostgreSQL with Prisma ORM                          |
| Auth     | JWT + email OTP verification                        |
| Email    | Nodemailer (Mailpit for local dev)                  |
| Tests    | Vitest                                              |

## Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) v18+
- [Docker](https://www.docker.com/) & Docker Compose

### 1. Start infrastructure (one command)

```bash
docker compose up -d
```

This starts:
- **PostgreSQL** on `localhost:5433`
- **Mailpit SMTP** on `localhost:1025`
- **Mailpit Web UI** at [http://localhost:8025](http://localhost:8025)

### 2. Set up the backend

```bash
cd backend
npm install
cp .env.example .env          # already pre-filled for local dev
npx prisma migrate dev        # apply database migrations
npm run dev                   # start the dev server
```

### 3. Verify

```bash
curl http://localhost:3000/api/health
```

## Project Structure

```
PadosiPro/
├── backend/          # Express API server
│   ├── prisma/       # Database schema & migrations
│   └── src/
│       ├── config/   # Environment & configuration
│       ├── middleware/# Error handling, validation, auth
│       ├── routes/   # Route definitions
│       ├── services/ # Business logic
│       ├── utils/    # Shared helpers
│       └── tests/    # Test files
├── mobile/           # React Native Expo app (coming soon)
└── docker-compose.yml
```

## Available Scripts (backend/)

| Script            | Description                        |
| ----------------- | ---------------------------------- |
| `npm run dev`     | Start dev server with hot-reload   |
| `npm run build`   | Compile TypeScript                 |
| `npm start`       | Run compiled JS                    |
| `npm test`        | Run tests with Vitest              |
| `npm run prisma:migrate` | Run Prisma migrations       |
| `npm run prisma:seed`    | Seed the database            |
