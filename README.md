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

## Tester sur votre machine

Prérequis : Docker (avec Compose). Aucun autre outil à installer.

```bash
git checkout main && git pull
cp .env.example .env
docker compose up --build
```

Puis ouvrez http://localhost:3000 : créez un compte, déconnectez-vous, reconnectez-vous.
L'API est sur http://localhost:8000/docs. Pour repartir de zéro : `docker compose down -v`.

## Base de données

Schéma PostgreSQL : 46 tables réparties en 8 domaines (`backend/app/modules/*/models.py`),
conformément à `docs/04-Modele-Donnees-PostgreSQL.md`. Migrations Alembic :

```bash
cd backend
alembic upgrade head                           # appliquer (fait automatiquement par docker compose)
alembic revision --autogenerate -m "message"   # nouvelle migration après modif des modèles
alembic check                                  # vérifie qu'aucune migration ne manque
pytest                                         # tests (ceux de la base sont ignorés sans PostgreSQL)
```

## API d'authentification (`/api/v1`)

| Méthode | Route | Description |
| --- | --- | --- |
| POST | `/auth/register` | Crée un compte STUDENT, retourne l'utilisateur + jetons |
| POST | `/auth/login` | Connexion email / mot de passe |
| POST | `/auth/refresh` | Nouveau couple de jetons à partir du refresh token |
| POST | `/auth/logout` | Sans état : le client supprime ses jetons |
| GET / PATCH | `/me` | Profil de l'utilisateur connecté |
| POST | `/me/password` | Changer son mot de passe |

Réponses au format `{data, meta, error}`. Documentation interactive : `/docs`.

## Apprentissage (`/api/v1`)

| Méthode | Route | Description |
| --- | --- | --- |
| GET | `/programs`, `/programs/{slug}` | Catalogue public (le détail inclut la progression si connecté) |
| POST | `/programs/{id}/enroll` | S'inscrire à un programme (idempotent) |
| GET | `/me/enrollments`, `/me/next` | Mes programmes ; prochaine leçon à faire |
| GET | `/lessons/{id}` | Leçon + contenus + activités (**sans les solutions**) |
| POST | `/activities/{id}/submit` | Corrige, enregistre la tentative, recalcule la progression |

Correction automatique : QCM, vrai/faux, texte à compléter, traduction, remise en ordre, association.
Speaking / réponse libre : enregistrés mais non notés. Une leçon est terminée quand toutes ses
activités sont réussies (au moins une tentative correcte, ou une tentative pour les non corrigées).

Contenu de démonstration : `python -m app.seed` (lancé automatiquement par `docker compose`).
⚠️ Provisoire : à faire relire par un enseignant d'anglais avant tout usage réel.

## Workflow Git

`main` reste stable. Chaque gros changement vit dans sa branche, intégrée par PR :

`feature/*` · `fix/*` · `refactor/*` · `chore/*`

Branches prévues (ordre de l'architecture, §71) :

1. `chore/project-foundation` — repo, Docker, FastAPI, Next.js ✅
2. `feature/database-schema` — modèles + migration Alembic ✅
3. `feature/auth` — inscription, connexion, rôles, profils ✅
3b. `feature/frontend-auth` — pages inscription, connexion, tableau de bord ✅
4. `feature/learning-engine` — programmes, cours, leçons, activités ✅
5. `feature/placement-test` — évaluation, scoring, progression
6. `feature/speaking-lab` — scénarios, audio, STT, feedback IA
7. `feature/teacher-admin` — dashboards, CMS
8. `feature/billing` — plans, abonnements, paiements, notifications
