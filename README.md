# EduPulse AI Interactive

AI-powered education platform prototype with BMAD Method workflows for structured product development.

## Contents

- `EduPulse_AI_Interactive_Prototype.html` — interactive UI prototype
- `edupulse/frontend/` — **standalone** Expo React Native app
- `edupulse/backend/` — **standalone** NestJS API + worker + Docker
- `_bmad/` — BMAD Method agents, workflows, and configuration
- `.agents/skills/` — Cursor skills for BMAD workflows
- `_bmad-output/` — planning and implementation artifacts
- `docs/` — project knowledge

## Getting Started

### Prototype

Open `EduPulse_AI_Interactive_Prototype.html` in a browser.

### Platform (separate frontend & backend)

```bash
# Backend
cd edupulse/backend && cp .env.example .env
cd api && npm install && npm run dev

# Frontend (separate terminal)
cd edupulse/frontend && cp .env.example .env
npm install && npm start
```

See [edupulse/README.md](edupulse/README.md).
