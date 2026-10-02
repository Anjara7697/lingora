# LINGORA - MODÈLE DE DONNÉES POSTGRESQL - 5

**Projet :** Lingora

**Version :** 1.0

**Base de données :** PostgreSQL

**Architecture :** Modular Monolith / API-first

**Backend :** FastAPI / Python

**Frontend :** Next.js / TypeScript / PWA

**Statut :** Conception technique

---

# 1. Objectif du modèle de données

La base PostgreSQL constitue la **source de vérité de Lingora**.

Elle doit permettre de gérer :

- les utilisateurs ;
- les rôles et permissions ;
- les profils étudiants et enseignants ;
- les programmes pédagogiques ;
- les cours ;
- les leçons ;
- les activités et exercices ;
- les compétences linguistiques ;
- les tests de positionnement ;
- les évaluations ;
- les résultats ;
- les sessions Speaking Lab ;
- les enregistrements audio ;
- les transcriptions ;
- les analyses IA ;
- les feedbacks enseignants ;
- la progression ;
- les objectifs ;
- les recommandations ;
- les abonnements ;
- les paiements ;
- les notifications ;
- les événements et statistiques produit ;
- l'administration.

Le modèle doit respecter quatre principes :

1. **Les données pédagogiques ne doivent pas dépendre de l'interface.**
2. **La progression doit être historisée autant que possible.**
3. **Les données IA doivent être séparées des données pédagogiques fondamentales.**
4. **Le modèle doit pouvoir évoluer sans migration majeure vers une architecture différente.**

---

# 2. Vue globale du modèle

Le modèle est organisé en huit domaines.

```
┌─────────────────────────────────────────────┐
│                  IDENTITY                   │
│ users / roles / permissions / profiles      │
└──────────────────────┬──────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────┐
│                  LEARNING                   │
│ programs / courses / lessons / activities  │
│ contents / skills                           │
└──────────────────────┬──────────────────────┘
                       │
          ┌────────────┴─────────────┐
          ▼                          ▼
┌─────────────────────┐    ┌─────────────────────┐
│    ASSESSMENT       │    │      SPEAKING       │
│ placement / tests   │    │ sessions / attempts │
│ evaluations / score │    │ audio / transcript  │
└──────────┬──────────┘    │ AI analysis         │
           │               └──────────┬──────────┘
           │                          │
           └────────────┬─────────────┘
                        ▼
             ┌─────────────────────┐
             │      PROGRESS       │
             │ skills / goals      │
             │ achievements        │
             │ recommendations     │
             └──────────┬──────────┘
                        │
          ┌─────────────┴─────────────┐
          ▼                           ▼
┌─────────────────────┐     ┌─────────────────────┐
│      COMMERCE       │     │      PLATFORM       │
│ plans               │     │ notifications       │
│ subscriptions       │     │ analytics/events    │
│ payments            │     │ administration      │
└─────────────────────┘     └─────────────────────┘
```

---

# 3. Conventions générales

## 3.1 Identifiants

Toutes les tables principales utilisent :

```sql
id UUID PRIMARY KEY
```

Pourquoi UUID :

- évite les identifiants facilement devinables ;
- facilite les systèmes distribués futurs ;
- compatible avec les APIs ;
- adapté à une éventuelle évolution vers plusieurs services.

PostgreSQL :

```sql
CREATE EXTENSION IF NOT EXISTS pgcrypto;
```

Puis :

```sql
id UUID PRIMARY KEY DEFAULT gen_random_uuid()
```

---

# 4. Gestion des dates

Les dates doivent utiliser :

```sql
TIMESTAMPTZ
```

et non `TIMESTAMP` simple.

Convention :

```
created_at
updated_at
deleted_at
```

Les données importantes ne sont pas supprimées physiquement lorsque l'historique métier doit être conservé.

---

# 5. ENUMS principaux

Les ENUM PostgreSQL sont utilisés uniquement lorsque l'ensemble des valeurs est relativement stable.

## 5.1 UserRole

```sql
CREATE TYPE user_role AS ENUM (
    'STUDENT',
    'TEACHER',
    'ADMIN'
);
```

---

## 5.2 UserStatus

```sql
CREATE TYPE user_status AS ENUM (
    'PENDING',
    'ACTIVE',
    'SUSPENDED',
    'DELETED'
);
```

---

## 5.3 SkillType

```sql
CREATE TYPE skill_type AS ENUM (
    'GRAMMAR',
    'VOCABULARY',
    'LISTENING',
    'READING',
    'WRITING',
    'SPEAKING',
    'PRONUNCIATION',
    'FLUENCY'
);
```

---

## 5.4 ContentType

```sql
CREATE TYPE content_type AS ENUM (
    'TEXT',
    'IMAGE',
    'AUDIO',
    'VIDEO',
    'DOCUMENT',
    'EXTERNAL_LINK'
);
```

---

## 5.5 ActivityType

```sql
CREATE TYPE activity_type AS ENUM (
    'MCQ',
    'TRUE_FALSE',
    'FILL_BLANK',
    'MATCHING',
    'ORDERING',
    'TRANSLATION',
    'LISTENING',
    'READING',
    'WRITING',
    'SPEAKING',
    'OPEN_QUESTION'
);
```

---

## 5.6 Difficulty

```sql
CREATE TYPE difficulty_level AS ENUM (
    'BEGINNER',
    'ELEMENTARY',
    'INTERMEDIATE',
    'UPPER_INTERMEDIATE',
    'ADVANCED'
);
```

---

# 6. DOMAINE IDENTITY

---

# 6.1 users

Table centrale de tous les utilisateurs.

```
users
├── id
├── email
├── password_hash
├── first_name
├── last_name
├── phone
├── role
├── status
├── email_verified_at
├── last_login_at
├── created_at
├── updated_at
└── deleted_at
```

### Colonnes

| Colonne | Type | Contraintes |
| --- | --- | --- |
| id | UUID | PK |
| email | CITEXT | UNIQUE |
| password_hash | TEXT | nullable selon auth |
| first_name | VARCHAR(100) | NOT NULL |
| last_name | VARCHAR(100) | NOT NULL |
| phone | VARCHAR(30) | UNIQUE nullable |
| role | user_role | NOT NULL |
| status | user_status | NOT NULL |
| email_verified_at | TIMESTAMPTZ | nullable |
| last_login_at | TIMESTAMPTZ | nullable |
| created_at | TIMESTAMPTZ | NOT NULL |
| updated_at | TIMESTAMPTZ | NOT NULL |
| deleted_at | TIMESTAMPTZ | nullable |

---

# 6.2 user_profiles

Informations complémentaires du profil.

```
user_profiles
├── id
├── user_id
├── avatar_url
├── birth_date
├── country
├── city
├── native_language
├── timezone
├── bio
├── created_at
└── updated_at
```

Relation :

```
users 1 ───── 1 user_profiles
```

---

# 6.3 roles

Même si `users.role` suffit pour le MVP, une table de rôles permet une évolution vers des permissions plus fines.

```
roles
├── id
├── code
├── name
└── description
```

Exemples :

```
STUDENT
TEACHER
ADMIN
```

---

# 6.4 permissions

```
permissions
├── id
├── code
├── name
└── description
```

Exemples :

```
students.read
students.update
courses.create
courses.update
analytics.read
users.manage
```

---

# 6.5 role_permissions

Table d'association :

```
role_permissions
├── role_id
└── permission_id
```

Relation :

```
roles N ───── N permissions
```

---

# 7. DOMAINE LEARNING

Le domaine Learning constitue le cœur pédagogique.

---

# 7.1 skills

Représente les compétences travaillées.

```
skills
├── id
├── code
├── name
├── description
├── type
├── parent_id
├── created_at
└── updated_at
```

Exemples :

```
SPEAKING
PRONUNCIATION
FLUENCY
GRAMMAR
VOCABULARY
LISTENING
```

Une compétence peut avoir une sous-compétence.

Exemple :

```
SPEAKING
 ├── FLUENCY
 ├── PRONUNCIATION
 └── ACCURACY
```

Relation :

```
skills 1 ───── N skills
```

via `parent_id`.

---

# 7.2 programs

Un programme pédagogique complet.

Exemples :

```
English Start
English Speaking
English for Career
```

```
programs
├── id
├── name
├── slug
├── description
├── difficulty
├── duration_weeks
├── is_published
├── created_at
├── updated_at
└── deleted_at
```

---

# 7.3 courses

Un programme contient plusieurs cours.

```
programs 1 ───── N courses
```

```
courses
├── id
├── program_id
├── title
├── slug
├── description
├── position
├── difficulty
├── estimated_minutes
├── is_published
├── created_at
├── updated_at
└── deleted_at
```

---

# 7.4 lessons

```
courses 1 ───── N lessons
```

```
lessons
├── id
├── course_id
├── title
├── slug
├── description
├── position
├── estimated_minutes
├── is_published
├── created_at
├── updated_at
└── deleted_at
```

---

# 7.5 contents

Les contenus réutilisables.

```
contents
├── id
├── type
├── title
├── body
├── url
├── metadata
├── created_at
└── updated_at
```

`metadata` :

```sql
JSONB
```

permet par exemple :

```json
{
  "duration": 120,
  "mime_type": "audio/mpeg",
  "language": "en"
}
```

---

# 7.6 lesson_contents

Association entre une leçon et ses contenus.

```
lesson_contents
├── id
├── lesson_id
├── content_id
└── position
```

Cela permet de construire :

```
Lesson
 ├── Introduction
 ├── Video
 ├── Vocabulary
 ├── Grammar
 ├── Exercise
 └── Speaking
```

---

# 7.7 activities

Les activités interactives.

```
activities
├── id
├── lesson_id
├── type
├── title
├── instructions
├── position
├── points
├── difficulty
├── configuration
├── created_at
├── updated_at
└── deleted_at
```

`configuration JSONB` permet de stocker la structure spécifique de l'activité.

Exemple :

```json
{
  "question": "Choose the correct answer",
  "options": [
    "I am",
    "I is",
    "I are"
  ],
  "correct_answer": 0
}
```

---

# 7.8 activity_answers

Pour les activités dont les réponses doivent être historisées.

```
activity_answers
├── id
├── activity_id
├── label
├── value
├── is_correct
└── position
```

---

# 7.9 course_skills

Associe les compétences aux cours.

```
course_skills
├── course_id
├── skill_id
├── weight
└── target_level
```

Relation :

```
courses N ───── N skills
```

---

# 7.10 lesson_skills

Même principe au niveau des leçons.

```
lesson_skills
├── lesson_id
├── skill_id
└── weight
```

---

# 8. INSCRIPTION À UN PROGRAMME

## 8.1 enrollments

Permet de savoir quel étudiant suit quel programme.

```
enrollments
├── id
├── student_id
├── program_id
├── started_at
├── completed_at
├── progress_percentage
├── status
├── created_at
└── updated_at
```

Statuts :

```
ACTIVE
COMPLETED
PAUSED
CANCELLED
```

Relation :

```
users N ───── N programs
```

via `enrollments`.

---

# 9. PROGRESSION PÉDAGOGIQUE

---

# 9.1 lesson_progress

Progression d'un étudiant sur une leçon.

```
lesson_progress
├── id
├── student_id
├── lesson_id
├── status
├── progress_percentage
├── started_at
├── completed_at
├── last_activity_at
├── created_at
└── updated_at
```

---

# 9.2 activity_attempts

Historique des tentatives.

```
activity_attempts
├── id
├── student_id
├── activity_id
├── answer
├── is_correct
├── score
├── duration_seconds
├── attempted_at
└── metadata
```

`answer` peut être `JSONB`.

---

# 9.3 course_progress

Vue persistée de progression.

```
course_progress
├── id
├── student_id
├── course_id
├── progress_percentage
├── score
├── completed_at
├── last_activity_at
├── created_at
└── updated_at
```

---

# 10. DOMAINE ASSESSMENT

---

# 10.1 assessments

Table générique des évaluations.

```
assessments
├── id
├── name
├── type
├── description
├── instructions
├── difficulty
├── is_published
├── created_at
└── updated_at
```

Types :

```
PLACEMENT
COURSE
LEVEL
PROGRESS
FINAL
```

---

# 10.2 assessment_questions

```
assessment_questions
├── id
├── assessment_id
├── activity_id
├── position
├── weight
└── required
```

---

# 10.3 assessment_attempts

Une tentative d'évaluation.

```
assessment_attempts
├── id
├── assessment_id
├── student_id
├── started_at
├── completed_at
├── score
├── status
└── metadata
```

---

# 10.4 assessment_answers

```
assessment_answers
├── id
├── attempt_id
├── question_id
├── answer
├── score
├── is_correct
├── feedback
└── created_at
```

---

# 10.5 assessment_skill_scores

Permet de ne pas limiter le résultat à une note globale.

```
assessment_skill_scores
├── id
├── attempt_id
├── skill_id
├── score
├── level
└── confidence
```

Exemple :

```
Speaking       42
Grammar        61
Vocabulary     55
Listening      48
```

---

# 11. PLACEMENT TEST

Le placement test utilise le système d'assessment.

```
assessment
       │
       ▼
assessment_attempt
       │
       ├── assessment_answers
       │
       └── assessment_skill_scores
```

Le niveau recommandé est ensuite enregistré dans :

```
student_learning_profiles
```

---

# 12. student_learning_profiles

Profil pédagogique de l'étudiant.

```
student_learning_profiles
├── id
├── student_id
├── current_level
├── target_level
├── primary_goal
├── placement_attempt_id
├── confidence_score
├── created_at
└── updated_at
```

Exemples de niveaux :

```
A1
A2
B1
B2
C1
C2
```

Le niveau ne doit pas être déduit uniquement d'une moyenne globale.

---

# 13. DOMAINE SPEAKING

C'est l'un des domaines les plus importants de Lingora.

---

# 13.1 speaking_scenarios

Un scénario de conversation.

Exemples :

```
Job interview
Hotel reception
Client meeting
Introducing yourself
Freelance client call
Travel situation
```

```
speaking_scenarios
├── id
├── title
├── slug
├── description
├── context
├── difficulty
├── estimated_minutes
├── is_ai_enabled
├── is_published
├── created_at
└── updated_at
```

---

# 13.2 speaking_scenario_skills

```
speaking_scenario_skills
├── scenario_id
├── skill_id
└── weight
```

---

# 13.3 speaking_sessions

Session de pratique d'un étudiant.

```
speaking_sessions
├── id
├── student_id
├── scenario_id
├── mode
├── status
├── started_at
├── completed_at
└── metadata
```

Modes :

```
PRACTICE
AI_CONVERSATION
ASSESSMENT
```

---

# 13.4 speaking_turns

Une conversation est constituée de plusieurs tours.

```
speaking_turns
├── id
├── session_id
├── sequence_number
├── speaker
├── text
├── audio_file_id
├── created_at
```

Speaker :

```
STUDENT
AI
TEACHER
```

---

# 13.5 media_files

Les fichiers physiques ne sont pas stockés directement dans PostgreSQL.

PostgreSQL conserve leurs métadonnées.

```
media_files
├── id
├── storage_provider
├── storage_key
├── original_filename
├── mime_type
├── size_bytes
├── duration_seconds
├── checksum
├── created_at
└── deleted_at
```

Exemple :

```
storage_provider = S3
storage_key = speaking/2026/10/uuid.webm
```

---

# 13.6 speech_transcriptions

Résultat STT.

```
speech_transcriptions
├── id
├── media_file_id
├── provider
├── model
├── language
├── text
├── confidence
├── processing_time_ms
├── raw_response
├── created_at
```

`raw_response` :

```sql
JSONB
```

---

# 13.7 ai_analyses

Analyse pédagogique produite par l'IA.

```
ai_analyses
├── id
├── speaking_turn_id
├── provider
├── model
├── analysis_type
├── score
├── result
├── raw_response
├── created_at
```

`result` :

```json
{
  "grammar": {
    "score": 72,
    "issues": []
  },
  "pronunciation": {
    "score": 64
  },
  "fluency": {
    "score": 70
  },
  "vocabulary": {
    "score": 68
  }
}
```

---

# 13.8 speaking_feedback

Feedback final présenté à l'étudiant.

```
speaking_feedback
├── id
├── session_id
├── overall_score
├── strengths
├── weaknesses
├── recommendations
├── generated_by
├── reviewed_by
├── created_at
└── updated_at
```

Les champs complexes peuvent être stockés en `JSONB`.

---

# 13.9 teacher_feedback

Feedback humain.

```
teacher_feedback
├── id
├── student_id
├── teacher_id
├── lesson_id
├── speaking_session_id
├── comment
├── score
├── created_at
└── updated_at
```

L'enseignant reste une source pédagogique distincte de l'IA.

---

# 14. DOMAINE PROGRESS

---

# 14.1 student_skill_progress

État actuel d'une compétence.

```
student_skill_progress
├── id
├── student_id
├── skill_id
├── score
├── level
├── confidence
├── last_assessed_at
├── created_at
└── updated_at
```

Contrainte :

```
UNIQUE(student_id, skill_id)
```

---

# 14.2 skill_progress_history

Historique de progression.

```
skill_progress_history
├── id
├── student_id
├── skill_id
├── source_type
├── source_id
├── score
├── level
├── recorded_at
```

Exemples de source :

```
PLACEMENT_TEST
LESSON
SPEAKING
TEACHER
ASSESSMENT
```

Cela permet de construire les graphiques de progression.

---

# 14.3 goals

Objectifs personnels.

```
goals
├── id
├── student_id
├── type
├── title
├── description
├── target_value
├── current_value
├── deadline
├── status
├── created_at
└── updated_at
```

Exemples :

```
Speak English 15 minutes/day
Reach B2
Prepare a job interview
Improve pronunciation
```

---

# 14.4 recommendations

Recommandations pédagogiques.

```
recommendations
├── id
├── student_id
├── type
├── title
├── description
├── source
├── priority
├── status
├── expires_at
├── created_at
└── updated_at
```

Exemples :

```
Practice pronunciation
Review vocabulary
Complete lesson 4
Practice job interview
```

---

# 15. DOMAINE COMMERCE

---

# 15.1 plans

Offres commerciales.

```
plans
├── id
├── name
├── slug
├── description
├── price
├── currency
├── duration_days
├── is_active
├── created_at
└── updated_at
```

Exemples issus des hypothèses commerciales :

```
English Start
English Speaking
English for Career
English 1:1 Premium
Corporate English
```

Les prix restent des données commerciales configurables et ne doivent pas être codés en dur.

---

# 15.2 plan_features

Fonctionnalités incluses dans une offre.

```
plan_features
├── id
├── plan_id
├── code
├── name
├── value
└── metadata
```

Exemple :

```
speaking_lab = true
ai_conversation = true
teacher_feedback = 2/month
```

---

# 15.3 subscriptions

Abonnement d'un utilisateur.

```
subscriptions
├── id
├── student_id
├── plan_id
├── status
├── started_at
├── expires_at
├── cancelled_at
├── auto_renew
├── created_at
└── updated_at
```

Statuts :

```
PENDING
ACTIVE
PAUSED
EXPIRED
CANCELLED
```

---

# 15.4 payments

Paiements.

```
payments
├── id
├── student_id
├── subscription_id
├── amount
├── currency
├── provider
├── provider_transaction_id
├── status
├── paid_at
├── metadata
├── created_at
└── updated_at
```

Statuts :

```
PENDING
SUCCESS
FAILED
REFUNDED
CANCELLED
```

Le système doit permettre d'intégrer ultérieurement différents moyens de paiement locaux.

---

# 16. DOMAINE NOTIFICATIONS

---

# 16.1 notifications

```
notifications
├── id
├── user_id
├── type
├── title
├── message
├── channel
├── status
├── read_at
├── scheduled_at
├── sent_at
├── metadata
└── created_at
```

Canaux :

```
IN_APP
EMAIL
WHATSAPP
SMS
PUSH
```

Les intégrations réelles sont gérées par le backend et non directement par les tables.

---

# 17. DOMAINE ANALYTICS

---

# 17.1 events

Événements produit.

```
events
├── id
├── user_id
├── event_name
├── entity_type
├── entity_id
├── properties
├── occurred_at
└── session_id
```

Exemples :

```
user_registered
placement_started
placement_completed
lesson_started
lesson_completed
speaking_started
speaking_completed
subscription_created
payment_completed
```

`properties` :

```sql
JSONB
```

---

# 17.2 user_sessions

Sessions applicatives pour analytics et sécurité.

```
user_sessions
├── id
├── user_id
├── device_type
├── browser
├── os
├── ip_hash
├── started_at
└── ended_at
```

---

# 18. DOMAINE ADMINISTRATION

---

# 18.1 audit_logs

Traçabilité des opérations sensibles.

```
audit_logs
├── id
├── user_id
├── action
├── entity_type
├── entity_id
├── old_values
├── new_values
├── ip_hash
└── created_at
```

Exemples :

```
USER_UPDATED
SUBSCRIPTION_CANCELLED
COURSE_PUBLISHED
PAYMENT_UPDATED
ROLE_CHANGED
```

Les valeurs complexes sont en `JSONB`.

---

# 19. RELATIONS PRINCIPALES

Vue simplifiée :

```
USER
 │
 ├── USER_PROFILE
 │
 ├── ENROLLMENT ───── PROGRAM
 │                       │
 │                       └── COURSE
 │                            │
 │                            └── LESSON
 │                                 │
 │                                 ├── CONTENT
 │                                 └── ACTIVITY
 │
 ├── ASSESSMENT_ATTEMPT
 │        │
 │        └── SKILL_SCORES
 │
 ├── SPEAKING_SESSION
 │        │
 │        ├── SPEAKING_TURNS
 │        │       ├── MEDIA_FILE
 │        │       ├── TRANSCRIPTION
 │        │       └── AI_ANALYSIS
 │        │
 │        └── SPEAKING_FEEDBACK
 │
 ├── SKILL_PROGRESS
 │
 ├── GOALS
 │
 ├── RECOMMENDATIONS
 │
 ├── SUBSCRIPTIONS
 │        │
 │        └── PLAN
 │
 ├── PAYMENTS
 │
 └── NOTIFICATIONS
```

---

# 20. CONTRAINTES IMPORTANTES

## 20.1 Email

```sql
UNIQUE(email)
```

avec comparaison insensible à la casse.

---

## 20.2 Enrollment

Un étudiant ne doit pas avoir deux inscriptions actives identiques :

```
UNIQUE(student_id, program_id)
```

selon la stratégie métier retenue.

---

## 20.3 Progression

```
UNIQUE(student_id, skill_id)
```

pour `student_skill_progress`.

---

## 20.4 Position

Les éléments ordonnés doivent utiliser :

```
position INTEGER
```

Exemple :

```
lesson.position
activity.position
content.position
```

---

# 21. INDEXATION

Les index principaux :

```sql
CREATE INDEX idx_users_email
ON users(email);

CREATE INDEX idx_enrollments_student
ON enrollments(student_id);

CREATE INDEX idx_enrollments_program
ON enrollments(program_id);

CREATE INDEX idx_lessons_course
ON lessons(course_id);

CREATE INDEX idx_activities_lesson
ON activities(lesson_id);

CREATE INDEX idx_activity_attempts_student
ON activity_attempts(student_id);

CREATE INDEX idx_assessment_attempts_student
ON assessment_attempts(student_id);

CREATE INDEX idx_speaking_sessions_student
ON speaking_sessions(student_id);

CREATE INDEX idx_speaking_turns_session
ON speaking_turns(session_id);

CREATE INDEX idx_skill_progress_student
ON student_skill_progress(student_id);

CREATE INDEX idx_skill_history_student
ON skill_progress_history(student_id);

CREATE INDEX idx_subscriptions_student
ON subscriptions(student_id);

CREATE INDEX idx_payments_student
ON payments(student_id);

CREATE INDEX idx_notifications_user
ON notifications(user_id);

CREATE INDEX idx_events_user
ON events(user_id);

CREATE INDEX idx_events_name
ON events(event_name);

CREATE INDEX idx_events_occurred_at
ON events(occurred_at);
```

---

# 22. JSONB : où l'utiliser

JSONB doit être utilisé pour les données réellement variables.

### Bon usage

```
activity.configuration
content.metadata
ai_analysis.result
ai_analysis.raw_response
payment.metadata
event.properties
audit_logs.old_values
audit_logs.new_values
```

### Mauvais usage

Ne pas transformer toute la base en :

```
users.data JSONB
courses.data JSONB
students.data JSONB
```

Les données métier importantes doivent rester dans des colonnes relationnelles.

---

# 23. SOFT DELETE

Les principales entités éditoriales peuvent utiliser :

```
deleted_at
```

notamment :

```
users
programs
courses
lessons
activities
media_files
```

Une donnée pédagogique déjà utilisée par un étudiant ne doit pas être supprimée physiquement sans stratégie d'archivage.

---

# 24. HISTORISATION

Certaines informations doivent être historisées.

Notamment :

```
skill_progress_history
assessment_attempts
activity_attempts
speaking_sessions
speaking_turns
payments
audit_logs
```

Le principe est :

> L'état actuel est utile pour l'application ; l'historique est nécessaire pour comprendre l'évolution.
> 

---

# 25. SCORE ET PROGRESSION

Il est important de ne pas utiliser uniquement :

```
student.progress = 73%
```

Lingora doit conserver plusieurs dimensions.

Exemple :

```
Student
│
├── Grammar       68
├── Vocabulary    74
├── Listening     61
├── Speaking      52
├── Fluency       48
└── Pronunciation 57
```

Cela permet au moteur pédagogique de déterminer :

```
FORCE
WEAKNESS
NEXT_RECOMMENDATION
```

---

# 26. ARCHITECTURE DES DONNÉES IA

L'IA ne doit pas devenir la source de vérité pédagogique.

Architecture :

```
Student
   │
   ▼
Speaking Session
   │
   ▼
Speaking Turn
   │
   ├── Audio
   │
   ▼
Speech Transcription
   │
   ▼
AI Analysis
   │
   ▼
Speaking Feedback
   │
   ▼
Skill Progress History
```

L'IA produit une analyse.

Elle ne modifie pas directement et silencieusement :

```
student_skill_progress
```

Le backend applique ensuite les règles pédagogiques prévues.

---

# 27. ARCHITECTURE DES MÉDIAS

Les fichiers audio/vidéo ne sont pas stockés dans PostgreSQL.

```
PostgreSQL
     │
     └── media_files
              │
              └── storage_key
                       │
                       ▼
                 Object Storage
```

Exemple :

```
media_files.id
        ↓
storage_key
        ↓
speaking/2026/10/uuid.webm
```

Cela évite de gonfler inutilement la base.

---

# 28. MODÈLE DE PROGRESSION GLOBAL

La progression peut être calculée à partir de :

```
Placement
    +
Lesson Attempts
    +
Course Completion
    +
Speaking Performance
    +
Teacher Feedback
    +
Assessments
    ↓
Skill Progress
    ↓
Overall Learning Progress
```

Il est préférable de conserver :

```
score brut
score normalisé
niveau
source
date
```

plutôt que simplement un pourcentage.

---

# 29. ORDRE DE CRÉATION DES TABLES

Pour les migrations Alembic, l'ordre recommandé est :

### Phase 1 — Identity

```
users
user_profiles
roles
permissions
role_permissions
```

### Phase 2 — Learning

```
skills
programs
courses
lessons
contents
lesson_contents
activities
activity_answers
course_skills
lesson_skills
```

### Phase 3 — Enrollment & Progress

```
enrollments
lesson_progress
course_progress
activity_attempts
```

### Phase 4 — Assessment

```
assessments
assessment_questions
assessment_attempts
assessment_answers
assessment_skill_scores
student_learning_profiles
```

### Phase 5 — Speaking

```
speaking_scenarios
speaking_scenario_skills
media_files
speaking_sessions
speaking_turns
speech_transcriptions
ai_analyses
speaking_feedback
teacher_feedback
```

### Phase 6 — Progress

```
student_skill_progress
skill_progress_history
goals
recommendations
```

### Phase 7 — Commerce

```
plans
plan_features
subscriptions
payments
```

### Phase 8 — Platform

```
notifications
user_sessions
events
audit_logs
```

---

# 30. Périmètre MVP

Toutes les tables précédentes ne doivent pas nécessairement être implémentées au premier sprint.

Le MVP peut démarrer avec :

```
users
user_profiles

skills

programs
courses
lessons
contents
lesson_contents
activities
activity_answers
lesson_skills
course_skills

enrollments
lesson_progress
activity_attempts

assessments
assessment_questions
assessment_attempts
assessment_answers
assessment_skill_scores
student_learning_profiles

speaking_scenarios
speaking_sessions
speaking_turns
media_files
speech_transcriptions
ai_analyses
speaking_feedback

student_skill_progress
skill_progress_history
goals

plans
subscriptions
payments

notifications
events
```

Les fonctionnalités avancées pourront être ajoutées progressivement.

---

# 31. Évolutions V1 / V2

Le modèle est volontairement préparé pour :

### V1

```
Redis
Workers
AI Gateway
Object Storage
Notifications avancées
```

### V2

```
Adaptive Learning
AI Recommendations
Corporate Accounts
Teacher Teams
Advanced Analytics
Offline Synchronization
```

Le modèle PostgreSQL n'a pas besoin d'être remplacé pour ces évolutions.

---

# 32. Règles d'architecture à respecter

### Règle 1

Le frontend ne doit jamais accéder directement à PostgreSQL.

```
Next.js
   ↓
FastAPI
   ↓
PostgreSQL
```

---

### Règle 2

Les IDs PostgreSQL ne doivent pas être générés côté frontend.

---

### Règle 3

Les règles métier doivent rester dans le backend.

Exemple :

```
Student completes Speaking Session
        ↓
FastAPI
        ↓
calculate skill impact
        ↓
update progress
```

et non :

```
Next.js → UPDATE progress
```

---

### Règle 4

Les résultats IA bruts doivent être conservés séparément des données métier.

---

### Règle 5

Les données historiques importantes ne doivent pas être écrasées.

---

### Règle 6

Les fichiers lourds doivent rester dans Object Storage.

---

# 33. Architecture finale des données

```
                    ┌───────────────┐
                    │     USERS     │
                    └───────┬───────┘
                            │
             ┌──────────────┼──────────────┐
             ▼              ▼              ▼
        LEARNING       ASSESSMENT       COMMERCE
             │              │              │
             │              │              │
             ▼              ▼              ▼
        PROGRESS        RESULTS       PAYMENTS
             │
             ▼
         SPEAKING
             │
       ┌─────┴─────┐
       ▼           ▼
     AUDIO       AI ANALYSIS
       │           │
       └─────┬─────┘
             ▼
       SKILL PROGRESS
             │
             ▼
      RECOMMENDATIONS
```

---

# 34. Résumé du modèle

Le modèle PostgreSQL de Lingora repose donc sur les domaines suivants :

| Domaine | Responsabilité |
| --- | --- |
| Identity | utilisateurs, rôles, permissions |
| Learning | programmes, cours, leçons, activités |
| Assessment | placement et évaluations |
| Speaking | pratique orale et conversations |
| AI | transcription et analyse |
| Progress | compétences, progression, objectifs |
| Commerce | offres, abonnements, paiements |
| Platform | notifications, événements, audit |

La relation fondamentale du produit devient :

```
USER
 ↓
LEARNING
 ↓
PRACTICE
 ↓
ASSESSMENT
 ↓
SPEAKING
 ↓
FEEDBACK
 ↓
SKILL PROGRESS
 ↓
RECOMMENDATION
 ↓
NEXT LEARNING ACTION
```

C'est cette boucle qui constitue le cœur fonctionnel de Lingora.

---

# 35. Principe final

Le modèle PostgreSQL ne doit pas seulement répondre à :

> « Où stocker les données ? »
> 

Il doit permettre de répondre à :

> **« Qu'est-ce que cet apprenant a appris, comment l'a-t-il pratiqué, quelles difficultés a-t-il rencontrées, comment a-t-il progressé et quelle doit être sa prochaine action pédagogique ? »**
> 

C'est cette logique qui différencie la base de données de Lingora d'une simple base de données de plateforme de cours.