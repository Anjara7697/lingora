# Lingora — Learn. Speak. Grow.

[![CI](https://github.com/Anjara7697/lingora/actions/workflows/ci.yml/badge.svg)](https://github.com/Anjara7697/lingora/actions/workflows/ci.yml)

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
docker compose up --build
```

Aucun fichier `.env` n'est nécessaire en développement (valeurs par défaut incluses). Pour personnaliser :
`cp .env.example .env` (Linux/macOS) ou `copy .env.example .env` (Windows), puis éditez-le.

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

### Mot de passe oublié et limitation des tentatives

| Méthode | Route | Description |
| --- | --- | --- |
| POST | `/auth/forgot-password` | Envoie un lien par email. **Même réponse (202) que le compte existe ou non** |
| POST | `/auth/reset-password` | `{token, password, password_confirmation}` : change le mot de passe avec le lien reçu |

- Le lien est **à usage unique**, valable **30 minutes** (`PASSWORD_RESET_MINUTES`) ; une nouvelle demande invalide les précédentes ;
  3 demandes par heure et par compte au maximum. Seul le **hachage SHA-256** du jeton est stocké en base.
- Après une réinitialisation (ou une réinitialisation par un admin), **toutes les sessions ouvertes de la personne sont fermées**
  (les jetons émis avant le changement sont refusés, comparaison à la milliseconde).
- Un compte suspendu ne reçoit pas de lien. Les erreurs d'envoi sont journalisées mais n'affectent jamais la réponse.
- **Développement** (`EMAIL_BACKEND=console`, défaut) : le message, lien compris, est écrit dans les logs :
  `docker compose logs backend | grep reset-password`. **Production** : `EMAIL_BACKEND=smtp` + `SMTP_*` + `APP_BASE_URL` ;
  l'API **refuse de démarrer** en production avec le mode console.
- **Limitation des tentatives** (429 + en-tête `Retry-After`) : connexion 8/min par adresse **et** par compte (40/min par adresse),
  inscription 10 / 10 min, demandes de lien 3/h par adresse email, réinitialisations 10 / 15 min. Un bon mot de passe est aussi
  refusé pendant le blocage. Compteurs en mémoire (par processus) ; `X-Forwarded-For` n'est lu que si `TRUST_PROXY_HEADERS=true`.

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

## Test de niveau (`/api/v1`)

| Méthode | Route | Description |
| --- | --- | --- |
| PUT / GET | `/me/onboarding` | Objectif principal + minutes par jour |
| POST | `/placement/start` | Démarre (ou reprend) le test : 25 questions, sans aucun indice |
| PUT | `/placement/{attempt}/answers/{question}` | Enregistre / modifie une réponse |
| POST | `/placement/{attempt}/complete` | Corrige, calcule les niveaux, met à jour profil et progression |
| GET | `/placement/result`, `/placement/{attempt}/result` | Dernier résultat / un résultat précis |

Niveau CECRL estimé **par compétence** (grammaire, vocabulaire, lecture) et global : un niveau est validé
à ≥ 50 % de réussite, on s'arrête au premier niveau non validé (`assessment/level.py`). Chaque test est
conservé (historique) ; refaire le test ne réécrit jamais l'ancien. Pas encore de Listening ni de Speaking.
La banque de questions est provisoire et doit être validée par un enseignant.

Tests : ils utilisent leur propre base `<nom>_test`, créée et migrée automatiquement.

## Speaking Lab (`/api/v1/speaking`)

| Méthode | Route | Description |
| --- | --- | --- |
| GET | `/scenarios` | Situations disponibles (public) |
| POST | `/sessions` | Ouvre (ou reprend) une session de pratique |
| POST | `/sessions/{id}/turns` | **Une tentative** : audio (multipart) + durée + transcription → analyse |
| POST | `/sessions/{id}/complete` | Feedback final + mise à jour de la progression orale |
| GET | `/sessions/{id}` | Session, tentatives, feedback |
| GET | `/media/{id}?token=…` | Réécoute d'un enregistrement via URL signée (5 min) |

Architecture : `Router → Service → fournisseurs interchangeables` (`app/integrations/ai`, `app/integrations/storage`).
La sortie brute de l'IA est **validée et normalisée** avant usage ; l'IA ne modifie jamais la progression
directement : c'est une règle backend (lissage 70/30 sur le score de la compétence, historique conservé).
Les fichiers audio sont hors de PostgreSQL (stockage local `STORAGE_DIR`, volume Docker `media`) et jamais publics.
Garde-fous : formats/taille/durée limités, quota quotidien (`SPEAKING_DAILY_LIMIT`, défaut 20), usage IA journalisé
(`events.ai_usage`), erreurs fournisseur masquées à l'utilisateur.

**Mode démo (`AI_PROVIDER=demo`, par défaut)** : aucune clé d'API. Pas de vraie reconnaissance vocale : la
transcription vient du navigateur (Chrome/Edge) ou est saisie par l'utilisateur, puis analysée par des règles simples
(grammaire des erreurs fréquentes, vocabulaire, fluidité, pertinence). **La prononciation n'est pas évaluée.**
Pour un vrai fournisseur : implémenter `SpeechToText` / `SpeakingAnalyzer` (`integrations/ai/base.py`) et l'enregistrer
dans `integrations/ai/__init__.py`.

## Espace enseignant (`/api/v1/teacher`)

Réservé aux rôles TEACHER et ADMIN. Un enseignant ne voit **que les élèves qui lui sont assignés**
(table `teacher_students`) ; un élève d'un autre enseignant répond 404, jamais 403. L'ADMIN voit tous les élèves.

| Méthode | Route | Description |
| --- | --- | --- |
| GET | `/teacher/dashboard` | Élèves, actifs 7 j, progression moyenne, répartition par statut, élèves à suivre |
| GET | `/teacher/students?search=&status=` | Liste filtrable |
| GET | `/teacher/students/{id}` | Fiche : compétences, programmes, sessions d'oral, exercices récents, tests de niveau, feedback |
| GET | `/teacher/students/{id}/speaking/{session}` | Tentatives : transcription, audio (URL signée), analyse IA |
| POST | `/teacher/students/{id}/feedback` | Feedback humain (+ note optionnelle, session d'oral liée) → notification à l'élève |
| GET | `/me/notifications`, `/me/teacher-feedback` | Côté élève (+ `POST /me/notifications/{id}/read`, `/read-all`) |

Statut d'un élève (`teacher/service.py::classify`) : **Inactif** (≥ 14 j sans activité, ou jamais actif depuis > 7 j),
**Faible activité** (≥ 7 j), **Difficulté à l'oral** (score oral < 50), sinon **Progression normale** ; **Nouveau** si jamais actif depuis < 7 j.
Un feedback lié à une session d'oral marque le feedback IA comme relu par l'enseignant (`reviewed_by`).

**Comptes de démonstration (développement uniquement, jamais créés si `ENVIRONMENT=production`)** :
`teacher.demo@example.com` / `Teacher-demo-1` et `admin.demo@example.com` / `Admin-demo-1`.
Pour assigner des élèves (en attendant l'interface d'administration) :

```bash
docker compose exec backend python -m app.cli assign-all teacher.demo@example.com
docker compose exec backend python -m app.cli assign teacher.demo@example.com eleve@example.com
docker compose exec backend python -m app.cli create-user prof@example.com --role TEACHER --password '...'
docker compose exec backend python -m app.cli set-role eleve@example.com TEACHER
```

## Administration (`/api/v1/admin`, permission `users.manage` = ADMIN uniquement)

Les autorisations viennent de la base (tables `roles` / `permissions` / `role_permissions`, via `require_permission`).

| Méthode | Route | Description |
| --- | --- | --- |
| GET / POST | `/admin/users` | Liste (recherche, rôle, statut, pagination) / création d'un utilisateur (enseignant, admin…) |
| PATCH | `/admin/users/{id}` | Changer le rôle, **suspendre / réactiver** (effet immédiat, y compris sur les jetons déjà émis), renommer |
| POST | `/admin/users/{id}/password` | Réinitialiser le mot de passe (en attendant la récupération par email) |
| GET | `/admin/teachers`, `/admin/teachers/{id}/roster` | Enseignants avec nombre d'élèves ; élèves assignés / disponibles |
| POST / DELETE | `/admin/teachers/{id}/students[/{student}]` | Assigner (idempotent) / retirer des élèves |
| GET | `/admin/analytics` | Statistiques produit |

Garde-fous : on ne peut pas modifier son propre rôle ou statut, ni retirer le dernier administrateur actif ;
passer un enseignant en élève retire ses élèves ; toute opération sensible écrit dans `audit_logs`
(acteur, action, anciennes/nouvelles valeurs, jamais de mot de passe). Il n'y a pas de suppression de compte : on suspend.

Statistiques (`admin/analytics.py`, calculées à la demande, définitions renvoyées dans la réponse) :
indicateur principal du PRD (**élèves actifs sur 30 jours avec une progression mesurable**), élèves actifs 7/30 j,
nouveaux inscrits, tunnel d'activation (inscrit → onboarding → test de niveau → première leçon → première session d'oral),
activité d'oral et appels IA, séries sur 14 jours.

Les assignations se font maintenant dans l'interface (**Admin → Enseignants**) ; la CLI `app.cli` reste disponible.

## Création de contenu (CMS) — `/api/v1/cms`

Réservé aux rôles qui ont les permissions `courses.update` (lecture/édition) et `courses.create` (création) :
**enseignants et administrateurs** (les élèves reçoivent 403). Interface : menu **Contenu** (`/admin/content`).

Hiérarchie : **Programme → Cours → Leçon → (Contenus + Exercices)** ; **Situations d'oral** à part.
Statuts : **Brouillon** (invisible des élèves) → **Publié** ; **Archivé** = suppression logique (RB-09 : l'historique
des élèves — inscriptions, tentatives, progression — n'est jamais supprimé). Les situations d'oral ne se suppriment pas :
on les dépublie. La banque du test de niveau est un contenu système, invisible et non modifiable ici.

- **Règles de publication** (erreurs expliquées en français) : une leçon a besoin d'au moins un exercice valide ; un cours,
  d'au moins une leçon publiée ; un programme, d'au moins un cours publié contenant une leçon publiée. Dépublier est toujours possible
  (les élèves inscrits perdent l'accès, pas leur historique).
- **Exercices validés à l'écriture** (`learning/validation.py`) : QCM (2–6 options distinctes, bonne réponse valide),
  vrai/faux, texte à compléter (doit contenir `___`), traduction, remise en ordre (les mots sont mélangés automatiquement),
  association (paires uniques), oral / question ouverte / rédaction (consigne obligatoire). Tout ce que le CMS accepte est
  corrigeable par le moteur élève. Le type d'un exercice déjà tenté par des élèves ne peut plus changer.
- **Contenus** : texte, ou lien / image / audio / vidéo / document **par URL** (http(s) uniquement : `javascript:` etc. refusés).
  Pas encore de téléversement de fichiers.
- Ordre : boutons ↑ ↓ (les éléments neufs se placent à la fin) ; toute opération est écrite dans `audit_logs`.
- Éditer un exercice déjà publié modifie aussi sa correction pour les prochaines tentatives.

## Abonnements et paiements (`/api/v1/billing`)

Formule **gratuite** (quelques analyses Speaking par jour) et **Premium** (beaucoup plus d'analyses). L'équipe (enseignants, admin) n'est jamais limitée.

| Route | Rôle |
|---|---|
| `GET /billing/plans` | Offres payantes (public) |
| `GET /billing/me` | Mon accès : Premium ?, expiration, essai disponible, analyses restantes |
| `POST /billing/trial` | Essai gratuit de 7 jours, une seule fois par élève |
| `POST /billing/checkout` | Crée un paiement en attente et renvoie l'URL du fournisseur |
| `POST /billing/payments/{id}/demo-confirm` | Simule le retour du fournisseur de démonstration (jamais en production) |
| `POST /billing/webhooks/{fournisseur}` | Notification serveur signée (HMAC), idempotente |
| `POST /billing/cancel` | Arrête le renouvellement ; l'accès reste valable jusqu'au terme |

- Un paiement n'active l'abonnement que lorsqu'il est confirmé ; un renouvellement s'ajoute à la période restante.
- **Prix = données** (table `plans`, seed `app/seed_billing.py`) : 15 000 Ar / 30 jours, provisoire, à fixer avant le lancement.
- Réglages : `SPEAKING_FREE_DAILY_LIMIT` (3), `SPEAKING_DAILY_LIMIT` (Premium, 20), `TRIAL_DAYS`, `PAYMENT_PROVIDER` (`demo`), `PAYMENT_WEBHOOK_SECRET`.
- Fournisseur `demo` : aucun argent réel, page de simulation dans l'app. **La production refuse `PAYMENT_PROVIDER=demo`** : brancher MVola / Orange Money / Airtel Money / Stripe revient à ajouter une classe dans `app/integrations/payment/`.
- Interface : page **Premium** (`/billing`) dans le menu élève.

**Vue administrateur** (permission `users.manage`, page `/admin/payments`) :
- `GET /admin/billing/summary` : revenus (total et 30 derniers jours, par devise), abonnés payants, essais en cours, essais démarrés et part convertie en achat, paiements par statut.
- `GET /admin/payments?status=&limit=&offset=` : historique paginé avec l'élève concerné, filtrable par statut.
- « Abonné payant » = abonnement actif (ou annulé mais non expiré) sur une offre payante. « Essai → achat » = élèves ayant fait un essai puis au moins un paiement réussi.

## Application installable (PWA)

Lingora est installable sur l'écran d'accueil (manifeste `app/manifest.ts`, icônes `public/icons/`, service worker `public/sw.js` enregistré en production uniquement).

- Le service worker met en cache la coque applicative (`/_next/static`, icônes) et affiche la page `/offline` quand une navigation échoue sans réseau.
- L'API (`/api/*`) et l'audio ne sont **jamais** mis en cache : données toujours à jour et privées.
- Un bandeau signale la perte de connexion ; une invitation « Installer » apparaît quand le navigateur le permet.
- Limites actuelles : pas de leçons hors ligne (prévu en V2). Sur téléphone, l'installation exige HTTPS (`localhost` fait exception).

## Intégration continue (`.github/workflows/ci.yml`)

À chaque pull request et à chaque push sur `main`, GitHub Actions exécute (une nouvelle poussée annule l'exécution précédente) :

| Job | Vérifie |
| --- | --- |
| **Backend** | `ruff`, `alembic upgrade head` puis `alembic check` (aucun écart modèles / migrations), `pytest` sur un vrai PostgreSQL 16 |
| **Frontend** | `eslint`, `npm run typecheck` (types de routes Next.js puis `tsc`), `next build` |
| **Docker** | `docker compose config` sans `.env`, construction des images backend et frontend |

Rejouer la même chose en local : `cd backend && ruff check . && alembic check && pytest` puis `cd frontend && npm run lint && npm run typecheck && npm run build`.
Conseil : dans les paramètres du dépôt (Settings → Branches), exiger ces 3 jobs avant de fusionner dans `main`.

## Workflow Git

`main` reste stable. Chaque gros changement vit dans sa branche, intégrée par PR :

`feature/*` · `fix/*` · `refactor/*` · `chore/*`

Branches prévues (ordre de l'architecture, §71) :

1. `chore/project-foundation` — repo, Docker, FastAPI, Next.js ✅
2. `feature/database-schema` — modèles + migration Alembic ✅
3. `feature/auth` — inscription, connexion, rôles, profils ✅
3b. `feature/frontend-auth` — pages inscription, connexion, tableau de bord ✅
4. `feature/learning-engine` — programmes, cours, leçons, activités ✅
5. `feature/placement-test` — onboarding, test de niveau, scoring ✅
6. `feature/speaking-lab` — scénarios, audio, STT, feedback IA (mode démo) ✅
7. `feature/teacher-space` — espace enseignant, feedback humain, notifications ✅
7b. `feature/admin-users` — utilisateurs, rôles, assignations, statistiques ✅
7c. `feature/cms-content` — création/édition des programmes, cours, leçons, exercices, situations d'oral ✅
8. `feature/billing` — plans, abonnements, paiements, notifications
