# Lingora — Learn. Speak. Grow.

Plateforme d'apprentissage de l'anglais orientée pratique orale (Madagascar).
Modular Monolith : **Next.js** (PWA) + **FastAPI** + **PostgreSQL**.

Documents de référence : [`docs/`](docs/) (PRD, CDC, Architecture, Modèle de données).

## Démarrage

```bash
cp .env.example .env
docker compose up --build
```

- Frontend : http://localhost:3000
- API : http://localhost:8000 (docs : `/docs`, santé : `/health`, `/ready`)

Sans Docker : `cd backend && pip install -e ".[dev]" && uvicorn app.main:app --reload`
et `cd frontend && npm install && npm run dev`.

## Workflow Git

`main` reste stable. Chaque gros changement vit dans sa branche, intégrée par PR :

`feature/*` · `fix/*` · `refactor/*` · `chore/*`

Branches prévues (ordre de l'architecture, §71) :

1. `chore/project-foundation` — repo, Docker, FastAPI, Next.js *(ce commit)*
2. `feature/database-schema` — migrations Alembic (Identity, Learning…)
3. `feature/auth` — inscription, connexion, rôles, profils
4. `feature/learning-engine` — programmes, cours, leçons, activités
5. `feature/placement-test` — évaluation, scoring, progression
6. `feature/speaking-lab` — scénarios, audio, STT, feedback IA
7. `feature/teacher-admin` — dashboards, CMS
8. `feature/billing` — plans, abonnements, paiements, notifications
