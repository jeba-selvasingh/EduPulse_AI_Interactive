# EduPulse Backend

Standalone **NestJS API** + **BullMQ worker** + Docker infrastructure.

**No shared packages with `../frontend`.** The mobile app talks to this service over HTTP only.

## Structure

```
api/      NestJS REST API
worker/   Background job consumer
prisma/   PostgreSQL schema
docker/   Compose stack (postgres, redis, minio, keycloak, nginx)
```

## Setup

```bash
cp .env.example .env
chmod +x docker/nginx/generate-certs.sh docker/backup/backup.sh docker/backup/cron-entrypoint.sh
./docker/nginx/generate-certs.sh   # required before first compose up (TLS)

cd api && npm install && npm run build && cd ..
cd worker && npm install && npm run build && cd ..

docker compose -f docker/compose.yml up -d   # from backend/
cd api && npm run dev                         # :3000
cd worker && npm run dev
```

## Health

- HTTP: `http://localhost:3000/api/health`
- TLS: `https://localhost:3443/api/health` (after compose + certs)

## CORS

API enables CORS for the Expo dev server and mobile clients — frontend is a separate deployable unit.
