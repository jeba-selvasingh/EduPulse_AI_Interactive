# EduPulse Platform

Two **independent** projects — no monorepo, no shared packages:

| Folder | Stack | Purpose |
|--------|-------|---------|
| [`frontend/`](frontend/) | Expo React Native | Mobile app (iOS/Android) |
| [`backend/`](backend/) | NestJS + worker + Docker | REST API & infrastructure |

Communication is **HTTP-only** (`EXPO_PUBLIC_API_URL` → `/api/*`).

## Verify Story 1.1

```bash
./scripts/verify-story-1.1.sh
```

With Docker running, also confirm TLS:

```bash
cd backend/docker && docker compose up -d
curl -k https://localhost:3443/api/health
```

## Quick start

**Backend** (terminal 1):
```bash
cd backend
cp .env.example .env
./docker/nginx/generate-certs.sh
cd api && npm install && npm run dev
```

**Frontend** (terminal 2):
```bash
cd frontend
cp .env.example .env
npm install
npm start
```

See each folder's README for full setup.
