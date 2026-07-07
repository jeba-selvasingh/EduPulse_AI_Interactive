# EduPulse Frontend

Standalone **Expo React Native** mobile app. Communicates with the backend **only via HTTP** (`EXPO_PUBLIC_API_URL`).

No shared code or package dependencies with `../backend`.

## Setup

```bash
npm install
cp .env.example .env
npm start
```

## API contract

Health check: `GET {EXPO_PUBLIC_API_URL}/api/health`

Response shape is defined by the backend OpenAPI/health endpoint — keep in sync manually or via generated client later.
