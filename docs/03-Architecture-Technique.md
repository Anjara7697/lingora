# LINGORA - Architecture Technique & Architecture Système -4

## Architecture Technique & Architecture Système

**Produit :** Lingora

**Version :** 1.0

**Statut :** Architecture technique cible

**Base :** PRD v1.0 + CDC v1.0

**Marché initial :** Madagascar

**Architecture :** Web / PWA + API + services spécialisés

**Approche :** Modular Monolith évolutif

---

# 1. Objectif de l'architecture

L'architecture technique de Lingora doit répondre à cinq objectifs :

1. être suffisamment simple pour être développée et maintenue par une petite équipe ;
2. permettre un lancement progressif ;
3. séparer clairement les responsabilités ;
4. permettre l'intégration de services IA et externes ;
5. pouvoir évoluer sans réécriture majeure lorsque le nombre d'apprenants augmente.

L'objectif n'est donc pas de construire immédiatement une architecture microservices complexe.

## Architecture retenue

> **Modular Monolith + API-first + services externes spécialisés**
> 

Le backend reste initialement une seule application structurée par domaines fonctionnels.

Lorsque certains domaines deviennent réellement lourds, ils pourront être extraits en services indépendants.

---

# 2. Vue globale

```
                         ┌───────────────────────┐
                         │       INTERNET        │
                         └───────────┬───────────┘
                                     │
                          HTTPS / CDN / DNS
                                     │
                  ┌──────────────────▼──────────────────┐
                  │             FRONTEND                 │
                  │                                      │
                  │      Next.js + TypeScript            │
                  │      Tailwind CSS                    │
                  │      PWA                             │
                  │      Responsive / Mobile First      │
                  └──────────────────┬──────────────────┘
                                     │
                              HTTPS / REST API
                                     │
                  ┌──────────────────▼──────────────────┐
                  │              BACKEND                 │
                  │                                      │
                  │          FastAPI / Python            │
                  │                                      │
                  │ ┌──────────────────────────────────┐ │
                  │ │ Auth                             │ │
                  │ │ Users                            │ │
                  │ │ Learning                         │ │
                  │ │ Assessments                      │ │
                  │ │ Speaking                         │ │
                  │ │ Progress                         │ │
                  │ │ Payments                         │ │
                  │ │ Notifications                    │ │
                  │ │ Administration                   │ │
                  │ └──────────────────────────────────┘ │
                  └──────────────┬───────────┬──────────┘
                                 │           │
                         ┌───────▼──────┐   │
                         │ PostgreSQL   │   │
                         │              │   │
                         │ Core Data    │   │
                         └──────────────┘   │
                                            │
                              ┌─────────────▼─────────────┐
                              │       SERVICES IA         │
                              │                            │
                              │ STT → LLM → TTS           │
                              │ Feedback / Analysis       │
                              └────────────────────────────┘
```

---

# 3. Principe architectural principal

Lingora sera construit comme un **Modular Monolith**.

Cela signifie :

```
                    BACKEND LINGORA
                           │
       ┌───────────────────┼────────────────────┐
       │                   │                    │
   Identity            Learning              AI
       │                   │                    │
   Payments           Progression          Speaking
       │                   │                    │
 Notifications        Assessments          Analytics
```

Chaque domaine possède ses propres responsabilités.

Mais tous les domaines vivent initialement dans la même application backend.

---

# 4. Pourquoi éviter les microservices au départ ?

Les microservices introduiraient immédiatement :

- plusieurs applications ;
- plusieurs déploiements ;
- communication réseau interne ;
- monitoring distribué ;
- gestion de versions ;
- davantage de DevOps ;
- davantage de coûts ;
- davantage de points de panne.

Pour le MVP, cela serait disproportionné.

L'objectif commercial actuel est d'abord de valider le produit auprès des premiers apprenants. Le business model prévoit explicitement une approche très légère avant une plateforme plus complète.

---

# 5. Stack technique

## Frontend

### Next.js

Responsabilités :

- interface utilisateur ;
- routing ;
- rendu ;
- SEO ;
- PWA ;
- appels API ;
- gestion de session côté client ;
- responsive.

### TypeScript

Langage principal du frontend.

---

## UI

### Tailwind CSS

Responsabilités :

- design system ;
- responsive ;
- composants ;
- cohérence visuelle.

Une bibliothèque de composants peut être ajoutée si nécessaire, mais elle ne doit pas devenir une dépendance architecturale forte.

---

# 6. PWA

Lingora sera conçu comme une **Progressive Web App**.

Objectifs :

- installation sur smartphone ;
- expérience proche d'une application ;
- cache des ressources ;
- fonctionnement dégradé en cas de connexion faible ;
- possibilité d'introduire ultérieurement un vrai mode offline.

### Priorité

MVP :

- installabilité ;
- responsive ;
- cache des ressources essentielles.

V2 :

- cache de contenus pédagogiques ;
- synchronisation ;
- offline avancé.

---

# 7. Backend

## Technologie

**Python + FastAPI**

Le backend sera responsable de :

- logique métier ;
- API REST ;
- authentification ;
- autorisation ;
- gestion des utilisateurs ;
- moteur pédagogique ;
- progression ;
- évaluations ;
- speaking ;
- intégration IA ;
- paiements ;
- notifications ;
- administration.

---

# 8. Pourquoi FastAPI ?

FastAPI est particulièrement adapté à Lingora car il permet :

- API REST moderne ;
- typage Python ;
- validation via modèles ;
- documentation OpenAPI ;
- développement asynchrone ;
- intégration naturelle avec les services IA Python.

Le backend doit cependant rester indépendant des fournisseurs IA.

---

# 9. Architecture backend

```
backend/
│
├── app/
│   │
│   ├── main.py
│   │
│   ├── core/
│   │   ├── config.py
│   │   ├── security.py
│   │   ├── database.py
│   │   └── logging.py
│   │
│   ├── modules/
│   │   │
│   │   ├── auth/
│   │   ├── users/
│   │   ├── learning/
│   │   ├── courses/
│   │   ├── lessons/
│   │   ├── activities/
│   │   ├── assessments/
│   │   ├── speaking/
│   │   ├── progress/
│   │   ├── goals/
│   │   ├── subscriptions/
│   │   ├── payments/
│   │   ├── notifications/
│   │   ├── analytics/
│   │   └── admin/
│   │
│   ├── integrations/
│   │   ├── ai/
│   │   ├── storage/
│   │   ├── payments/
│   │   └── messaging/
│   │
│   └── shared/
│       ├── exceptions/
│       ├── schemas/
│       ├── utils/
│       └── dependencies/
│
├── tests/
├── migrations/
├── Dockerfile
├── pyproject.toml
└── README.md
```

---

# 10. Organisation interne d'un module

Chaque module doit suivre une structure cohérente.

Exemple :

```
modules/speaking/

├── router.py
├── schemas.py
├── models.py
├── service.py
├── repository.py
├── dependencies.py
└── tests/
```

## Responsabilités

### router.py

Expose les endpoints HTTP.

### schemas.py

Définit les modèles d'entrée et de sortie.

### models.py

Définit les entités persistées.

### service.py

Contient la logique métier.

### repository.py

Gère l'accès aux données.

---

# 11. Principe de séparation

Le router ne doit pas contenir la logique métier.

Mauvais :

```
HTTP Request
    ↓
Router
    ↓
SQL + logique métier + IA
```

Correct :

```
HTTP Request
    ↓
Router
    ↓
Service
    ↓
Repository
    ↓
Database
```

Pour l'IA :

```
Router
 ↓
Speaking Service
 ↓
AI Service
 ↓
Provider
```

---

# 12. Base de données

## Technologie

**PostgreSQL**

PostgreSQL constitue la source de vérité principale de Lingora.

Il doit stocker notamment :

- utilisateurs ;
- profils ;
- rôles ;
- programmes ;
- cours ;
- modules ;
- lessons ;
- activités ;
- évaluations ;
- résultats ;
- progression ;
- objectifs ;
- sessions Speaking ;
- abonnements ;
- paiements ;
- notifications ;
- données administratives.

---

# 13. Principe "PostgreSQL First"

Toutes les données métier importantes doivent être relationnelles.

```
User
 ↓
Profile
 ↓
Enrollment
 ↓
Program
 ↓
Course
 ↓
Lesson
 ↓
Activity
 ↓
Attempt
 ↓
Progress
```

MongoDB n'est pas nécessaire au MVP simplement parce que certaines données sont dynamiques.

La complexité doit être introduite uniquement lorsqu'un besoin réel le justifie.

---

# 14. ORM / accès PostgreSQL

Une couche ORM/repository sera utilisée afin d'éviter de disperser les requêtes SQL dans les routes.

La technologie ORM définitive pourra être :

- SQLAlchemy ;
- ou une alternative compatible avec l'architecture FastAPI.

Le choix sera arrêté dans la spécification technique PostgreSQL.

---

# 15. Migrations

Toutes les modifications du schéma doivent passer par un système de migration.

Exemple :

```
migration 001
migration 002
migration 003
...
```

Aucune modification manuelle de production ne doit devenir la méthode normale d'évolution de la base.

---

# 16. Redis

Redis n'est pas obligatoire au premier jour.

Il pourra être introduit pour :

- cache ;
- sessions temporaires ;
- rate limiting ;
- files d'attente ;
- tâches asynchrones ;
- données temporaires de conversation IA.

Architecture future :

```
FastAPI
   │
   ├── PostgreSQL
   │
   └── Redis
          │
          ├── Cache
          ├── Queue
          └── Temporary State
```

---

# 17. Stockage fichiers

Les fichiers volumineux ne doivent pas être stockés directement dans PostgreSQL.

Exemples :

- audio ;
- images ;
- vidéos ;
- documents ;
- enregistrements Speaking.

Architecture :

```
Application
     │
     ▼
Object Storage
     │
     ├── Audio
     ├── Images
     ├── Videos
     └── Documents
```

PostgreSQL conserve uniquement les métadonnées et références.

---

# 18. Architecture IA

L'IA doit être considérée comme une couche indépendante.

```
                    LINGORA
                       │
                 Speaking Service
                       │
                 AI Orchestrator
                       │
        ┌──────────────┼──────────────┐
        │              │              │
       STT            LLM            TTS
        │              │              │
   Speech → Text   Analyse/Chat   Text → Speech
```

---

# 19. AI Provider Abstraction

Le backend ne doit pas être directement dépendant d'un seul fournisseur.

Mauvais :

```
SpeakingService
      ↓
OpenAI SDK partout
```

Correct :

```
SpeakingService
      ↓
AI Provider Interface
      ↓
┌─────────┬─────────┬─────────┐
│Provider A│Provider B│Provider C│
└─────────┴─────────┴─────────┘
```

Cela permettra de changer de fournisseur sans réécrire le domaine Speaking.

---

# 20. Speech-to-Text

Flux :

```
Audio utilisateur
      ↓
Upload sécurisé
      ↓
STT Provider
      ↓
Transcript
      ↓
Speaking Analysis
```

Le transcript doit pouvoir être conservé lorsque cela est nécessaire au suivi pédagogique.

---

# 21. Analyse LLM

Le LLM peut analyser :

- contenu de la réponse ;
- grammaire ;
- vocabulaire ;
- pertinence ;
- structure ;
- fluidité textuelle ;
- suggestions.

Le système doit séparer :

```
Raw AI Output
       ↓
Validation
       ↓
Normalized Feedback
       ↓
Student
```

L'IA ne doit donc pas écrire directement dans les données métier sans validation.

---

# 22. TTS

Le Text-to-Speech peut être utilisé pour :

- dialogues ;
- exemples ;
- conversations IA ;
- prononciation ;
- listening.

---

# 23. Speaking Session

Architecture :

```
Student
  ↓
Create Session
  ↓
Scenario
  ↓
Prompt
  ↓
Record Audio
  ↓
Upload
  ↓
STT
  ↓
Transcript
  ↓
LLM Analysis
  ↓
Feedback
  ↓
Progress
```

---

# 24. Traitement asynchrone

Certaines opérations peuvent être longues :

- transcription ;
- analyse IA ;
- génération audio ;
- génération de rapports ;
- traitement de fichiers.

Elles ne doivent pas nécessairement bloquer une requête HTTP.

Architecture future :

```
API
 ↓
Queue
 ↓
Worker
 ↓
AI Provider
 ↓
Database
```

---

# 25. Notifications

Architecture :

```
Business Event
      ↓
Notification Service
      ↓
┌─────┼─────┐
│     │     │
Web  Email WhatsApp
```

Les canaux doivent être abstraits.

---

# 26. Authentification

Le système doit utiliser une authentification sécurisée basée sur :

- email ;
- mot de passe hashé ;
- tokens/session sécurisés ;
- expiration ;
- refresh mechanism si nécessaire.

Le mécanisme précis sera défini dans la spécification sécurité.

---

# 27. Autorisation

Le système doit utiliser une politique basée sur les rôles.

```
STUDENT
TEACHER
ADMIN
```

Mais l'architecture doit permettre ultérieurement des permissions plus fines.

Exemple :

```
teacher.content.read
teacher.feedback.write
admin.users.manage
admin.payments.read
```

---

# 28. API

Le backend expose une API REST versionnée.

```
/api/v1/
```

Exemple :

```
/api/v1/auth
/api/v1/users
/api/v1/programs
/api/v1/courses
/api/v1/lessons
/api/v1/activities
/api/v1/assessments
/api/v1/speaking
/api/v1/progress
/api/v1/goals
/api/v1/subscriptions
/api/v1/payments
/api/v1/notifications
/api/v1/admin
```

---

# 29. Convention API

Chaque endpoint doit respecter une convention uniforme.

Exemple :

```
GET    /api/v1/courses
GET    /api/v1/courses/{id}
POST   /api/v1/courses
PATCH  /api/v1/courses/{id}
DELETE /api/v1/courses/{id}
```

Les opérations destructives doivent être limitées aux rôles autorisés.

---

# 30. Format des réponses

Les réponses API doivent être standardisées.

Exemple conceptuel :

```json
{
  "data": {},
  "meta": {},
  "error": null
}
```

Erreur :

```json
{
  "data": null,
  "meta": {},
  "error": {
    "code": "LESSON_NOT_FOUND",
    "message": "Lesson not found"
  }
}
```

Les codes d'erreur doivent être stables et documentés.

---

# 31. Frontend

Structure cible :

```
frontend/

├── app/
│   ├── (public)/
│   ├── (auth)/
│   ├── (student)/
│   ├── (teacher)/
│   └── (admin)/
│
├── components/
│   ├── ui/
│   ├── learning/
│   ├── speaking/
│   ├── progress/
│   └── dashboard/
│
├── features/
│   ├── auth/
│   ├── learning/
│   ├── speaking/
│   ├── progress/
│   └── profile/
│
├── lib/
│   ├── api/
│   ├── auth/
│   ├── utils/
│   └── validations/
│
├── hooks/
├── types/
└── public/
```

---

# 32. Frontend — principe Feature First

Le code frontend doit être organisé autour des fonctionnalités plutôt que uniquement autour des types de fichiers.

Exemple :

```
features/speaking/

├── components/
├── hooks/
├── services/
├── types/
└── utils/
```

Cela permet d'éviter un frontend composé de centaines de composants génériques difficiles à maintenir.

---

# 33. Communication Frontend / Backend

```
Next.js
   │
   │ HTTPS
   ▼
FastAPI
   │
   ├── PostgreSQL
   ├── Storage
   ├── AI
   └── External Services
```

Le frontend ne doit jamais communiquer directement avec PostgreSQL.

---

# 34. Gestion des données frontend

Le frontend doit distinguer :

### Server Data

Données provenant de l'API :

- cours ;
- progression ;
- profil ;
- activités ;
- résultats.

### UI State

État local :

- modal ouverte ;
- filtre ;
- menu ;
- état d'un formulaire.

### Session State

- utilisateur connecté ;
- rôle ;
- permissions.

Cette séparation doit éviter un store global inutilement complexe.

---

# 35. Cache frontend

Les données peu volatiles peuvent être mises en cache.

Exemples :

- catalogue ;
- programmes ;
- contenus publics.

Les données sensibles ou très dynamiques doivent rester synchronisées avec l'API.

---

# 36. Architecture de sécurité

```
Internet
   ↓
HTTPS
   ↓
Frontend
   ↓
Authentication
   ↓
Authorization
   ↓
Validation
   ↓
Business Logic
   ↓
Database
```

---

# 37. Principes de sécurité

## Aucun secret dans Git

Les secrets doivent être stockés dans les variables d'environnement / gestionnaire de secrets.

Exemple :

```
DATABASE_URL
JWT_SECRET
AI_API_KEY
STORAGE_ACCESS_KEY
PAYMENT_SECRET
```

---

# 38. Validation

Toutes les données externes doivent être validées :

- frontend ;
- backend ;
- fichiers ;
- webhooks ;
- réponses fournisseurs.

Le frontend ne doit jamais être considéré comme une couche de sécurité.

---

# 39. Rate Limiting

Les endpoints sensibles doivent être protégés.

Exemples :

```
/login
/register
/password-reset
/speaking
/ai
```

Cela devient particulièrement important pour les fonctionnalités IA facturées à l'utilisation.

---

# 40. Protection des fichiers audio

Les fichiers audio Speaking ne doivent pas être exposés publiquement par défaut.

Architecture :

```
Student
 ↓
Authenticated API
 ↓
Authorization
 ↓
Temporary signed URL
 ↓
Storage
```

---

# 41. Webhooks

Les paiements et services externes peuvent envoyer des événements.

Un webhook doit :

1. vérifier son authenticité ;
2. valider les données ;
3. éviter les doublons ;
4. enregistrer l'événement ;
5. déclencher l'action métier.

---

# 42. Idempotence

Les opérations sensibles doivent être idempotentes.

Exemple paiement :

```
Payment Event #123
       ↓
Processed
       ↓
Payment PAID
```

Si le même événement arrive une deuxième fois :

```
Payment Event #123
       ↓
Already processed
       ↓
No duplicate payment
```

---

# 43. Logging

Les logs doivent permettre de comprendre :

- erreur ;
- utilisateur concerné ;
- module ;
- requête ;
- événement ;
- durée ;
- service externe.

Mais ils ne doivent jamais contenir :

- mot de passe ;
- token ;
- clé API ;
- données sensibles inutiles.

---

# 44. Observabilité

À terme :

```
Application
   │
   ├── Logs
   ├── Metrics
   ├── Errors
   └── Health Checks
```

Endpoints internes possibles :

```
/health
/ready
```

---

# 45. Tests

## Backend

### Unit Tests

Tester :

- services ;
- règles métier ;
- scoring ;
- progression ;
- permissions.

### Integration Tests

Tester :

- API + PostgreSQL ;
- authentification ;
- paiements ;
- IA mockée.

---

## Frontend

Tester :

- composants critiques ;
- formulaires ;
- parcours ;
- permissions ;
- états d'erreur.

---

## E2E

Parcours prioritaires :

```
Inscription
 ↓
Onboarding
 ↓
Test
 ↓
Résultat
 ↓
Learning Path
 ↓
Lesson
 ↓
Exercise
 ↓
Speaking
 ↓
Feedback
```

---

# 46. Docker

Tous les composants principaux doivent être containerisables.

Architecture locale :

```
Docker Compose

├── frontend
├── backend
├── postgres
├── redis
└── worker
```

Redis et worker peuvent rester désactivés dans le MVP minimal s'ils ne sont pas encore nécessaires.

---

# 47. Environnement

Trois environnements sont recommandés :

```
Development
     ↓
Staging
     ↓
Production
```

---

# 48. Variables d'environnement

## Development

```
.env.local
```

## Production

Les secrets doivent être fournis par l'infrastructure de déploiement.

Aucun secret ne doit être commité.

---

# 49. CI/CD

GitHub Actions peut gérer :

```
Push
 ↓
Lint
 ↓
Type Check
 ↓
Unit Tests
 ↓
Build
 ↓
Integration Tests
 ↓
Deploy Staging
 ↓
Validation
 ↓
Deploy Production
```

---

# 50. Git

Branches principales :

```
main
develop
```

Branches de travail :

```
feature/*
fix/*
refactor/*
chore/*
```

Exemple :

```
feature/speaking-lab
feature/placement-test
fix/auth-session
```

---

# 51. Architecture de déploiement cible

```
                    INTERNET
                       │
                     HTTPS
                       │
               ┌───────▼───────┐
               │ CDN / Hosting │
               │   Next.js     │
               └───────┬───────┘
                       │
                       │ HTTPS
                       ▼
               ┌───────────────┐
               │ API Server    │
               │ FastAPI       │
               └───────┬───────┘
                       │
          ┌────────────┼────────────┐
          │            │            │
          ▼            ▼            ▼
     PostgreSQL      Redis      Object Storage
          │
          │
          ▼
      AI Services
```

---

# 52. Architecture MVP

Le MVP peut être beaucoup plus simple :

```
                 Next.js
                    │
                    ▼
                FastAPI
                    │
                    ▼
               PostgreSQL
                    │
             ┌──────┴──────┐
             ▼             ▼
          Storage       AI Provider
```

C'est cette architecture qui doit être privilégiée au lancement.

---

# 53. Architecture V1

Lorsque le produit commence à avoir une activité réelle :

```
Next.js
   │
FastAPI
   │
├── PostgreSQL
├── Redis
├── Worker
├── Object Storage
└── AI Gateway
```

---

# 54. Architecture à grande échelle

Si certains domaines deviennent suffisamment importants :

```
                     API Gateway
                          │
        ┌─────────────────┼─────────────────┐
        │                 │                 │
    Core API         AI Service       Notification
        │                 │                 │
   PostgreSQL        AI Workers         Queue
        │
    Learning DB
```

Cette évolution ne doit intervenir qu'en présence d'un besoin réel.

---

# 55. Stratégie d'évolution

```
PHASE 1
Modular Monolith
+
PostgreSQL

        ↓

PHASE 2
Redis
+
Workers
+
Object Storage

        ↓

PHASE 3
AI Gateway
+
Advanced Analytics

        ↓

PHASE 4
Extraction éventuelle
de certains services
```

---

# 56. Domaines métier du backend

La séparation logique finale est :

```
IDENTITY
│
├── Auth
├── Users
└── Permissions

LEARNING
│
├── Programs
├── Courses
├── Lessons
├── Activities
└── Content

ASSESSMENT
│
├── Placement
├── Evaluations
└── Scoring

SPEAKING
│
├── Sessions
├── Attempts
├── Audio
└── Feedback

PROGRESS
│
├── Skills
├── Progress
├── Goals
└── Recommendations

COMMERCE
│
├── Plans
├── Subscriptions
└── Payments

PLATFORM
│
├── Notifications
├── Analytics
└── Administration
```

---

# 57. Flux principal de données

## Inscription

```
Browser
 ↓
Next.js
 ↓
POST /auth/register
 ↓
FastAPI
 ↓
Auth Service
 ↓
PostgreSQL
 ↓
Session
 ↓
Next.js
```

---

# 58. Flux Learning

```
Student
 ↓
Next.js
 ↓
GET /learning/path
 ↓
Learning Service
 ↓
PostgreSQL
 ↓
Learning Path
 ↓
Next.js
```

---

# 59. Flux Exercise

```
Student
 ↓
Submit Answer
 ↓
API
 ↓
Activity Service
 ↓
Evaluation
 ↓
Progress Service
 ↓
PostgreSQL
 ↓
Result
```

---

# 60. Flux Speaking

```
Student
 ↓
Record
 ↓
Upload
 ↓
Storage
 ↓
Speaking Service
 ↓
STT
 ↓
Transcript
 ↓
AI Analysis
 ↓
Feedback
 ↓
Progress
 ↓
Student
```

---

# 61. Flux paiement

```
Student
 ↓
Checkout
 ↓
Payment Provider
 ↓
Webhook
 ↓
Payment Service
 ↓
PostgreSQL
 ↓
Subscription Service
 ↓
Access updated
```

---

# 62. Gestion des erreurs

Chaque couche doit pouvoir échouer proprement.

Exemple IA indisponible :

```
AI Provider
     ↓
ERROR
     ↓
AI Service
     ↓
Retry / Fallback
     ↓
User-friendly message
```

L'erreur technique ne doit jamais être exposée directement à l'utilisateur.

---

# 63. Résilience IA

Les appels IA doivent prévoir :

- timeout ;
- retry limité ;
- fallback ;
- validation de réponse ;
- journalisation ;
- limitation des coûts.

---

# 64. Contrôle des coûts IA

Chaque utilisation IA doit idéalement pouvoir être associée à :

```
user_id
session_id
provider
model
tokens / durée audio
cost estimate
timestamp
```

Cela permettra de mesurer le coût réel du Speaking Lab.

---

# 65. Architecture pédagogique

Le moteur pédagogique doit rester indépendant de l'interface.

```
Student
   ↓
Learning Engine
   ↓
Assessment Data
   ↓
Progress
   ↓
Recommendation
   ↓
Next Activity
```

Le frontend ne doit pas décider seul quelle activité constitue la prochaine étape pédagogique.

---

# 66. Architecture de recommandation

Version initiale :

```
IF skill < threshold
THEN recommend practice
```

Version évoluée :

```
Level
+
Goal
+
History
+
Weak Skills
+
Recent Attempts
+
Teacher Feedback
        ↓
Recommendation Engine
        ↓
Next Activity
```

---

# 67. Décision architecturale importante

Lingora ne doit pas commencer par un moteur de recommandation IA complexe.

### MVP

Règles déterministes.

### V1

Personnalisation simple.

### V2

Recommandations assistées par IA.

Cela évite de rendre le produit dépendant de l'IA avant d'avoir suffisamment de données pédagogiques.

---

# 68. Architecture finale recommandée

```
                         LINGORA
                            │
                  ┌─────────▼─────────┐
                  │     Next.js       │
                  │ TypeScript + PWA  │
                  └─────────┬─────────┘
                            │
                         REST API
                            │
                  ┌─────────▼─────────┐
                  │      FastAPI      │
                  │                   │
                  │ Auth              │
                  │ Learning          │
                  │ Assessment        │
                  │ Speaking          │
                  │ Progress          │
                  │ Commerce          │
                  │ Notifications     │
                  │ Analytics         │
                  └───────┬─┬─────────┘
                          │ │
             ┌────────────┘ └─────────────┐
             │                            │
      ┌──────▼──────┐              ┌──────▼──────┐
      │ PostgreSQL  │              │ AI Gateway  │
      │             │              │             │
      │ Source of   │              │ STT         │
      │ Truth       │              │ LLM         │
      └─────────────┘              │ TTS         │
                                   └─────────────┘
             │
      ┌──────▼──────┐
      │   Storage  │
      │ Audio/Media│
      └─────────────┘

              ÉVOLUTION

              ┌─────────────┐
              │    Redis    │
              └──────┬──────┘
                     │
              ┌──────▼──────┐
              │   Workers   │
              └─────────────┘
```

---

# 69. Décisions techniques retenues

| Domaine | Choix |
| --- | --- |
| Frontend | Next.js |
| Langage frontend | TypeScript |
| UI | Tailwind CSS |
| Application | PWA |
| Backend | FastAPI |
| Langage backend | Python |
| API | REST |
| Base principale | PostgreSQL |
| ORM | À finaliser |
| Cache | Redis, évolution |
| Queue | Worker + Redis, évolution |
| Fichiers | Object Storage |
| IA | Provider abstraction |
| STT | Provider interchangeable |
| LLM | Provider interchangeable |
| TTS | Provider interchangeable |
| Auth | Session/token sécurisé |
| Conteneurisation | Docker |
| CI/CD | GitHub Actions |
| Architecture | Modular Monolith |
| Scalabilité | Extraction progressive |

---

# 70. Ce qui n'est volontairement PAS retenu au MVP

❌ Microservices complets

❌ Kubernetes

❌ MongoDB sans besoin métier

❌ Event-driven architecture complexe

❌ Kafka

❌ Service mesh

❌ Application mobile native

❌ Infrastructure cloud complexe

❌ Moteur IA autonome complet

Le principe reste :

> **Construire une architecture sérieuse, mais uniquement la complexité nécessaire.**
> 

---

# 71. Priorité d'implémentation technique

## Étape 1

```
Repository
Docker
PostgreSQL
FastAPI
Next.js
```

## Étape 2

```
Authentication
Users
Roles
Profiles
```

## Étape 3

```
Programs
Courses
Modules
Lessons
Activities
```

## Étape 4

```
Placement
Assessment
Scoring
Progress
```

## Étape 5

```
Speaking
Storage
STT
AI Feedback
```

## Étape 6

```
Teacher
Admin
CMS
Analytics
```

## Étape 7

```
Subscriptions
Payments
Notifications
```

## Étape 8

```
Redis
Workers
Offline
Advanced AI
```

---

# 72. Architecture cible finale

La philosophie technique de Lingora peut être résumée ainsi :

> **Simple au départ. Modulaire dès le début. Extensible par conception.**
> 

L'architecture ne doit pas chercher à anticiper artificiellement des millions d'utilisateurs.

Elle doit surtout garantir que le passage :

```
15 élèves
   ↓
100 élèves
   ↓
500 élèves
   ↓
plusieurs milliers
```

puisse se faire par évolution de l'infrastructure et extraction progressive des composants lourds, plutôt que par réécriture complète du produit.

---

# 73. Prochain document technique

L'étape suivante doit être :

# LINGORA — Architecture de la Base de Données PostgreSQL

Ce document devra définir précisément :

- entités ;
- tables ;
- colonnes ;
- types ;
- PK ;
- FK ;
- relations ;
- contraintes ;
- indexes ;
- enums ;
- timestamps ;
- soft delete ;
- historisation ;
- progression ;
- évaluations ;
- Speaking ;
- IA ;
- abonnements ;
- paiements ;
- notifications.

L'objectif sera ensuite de produire le **schéma PostgreSQL complet**, avant de commencer réellement le backend FastAPI.