# LINGORA - Product Requirements Document - 2

## Product Requirements Document — PRD

**Produit :** Lingora

**Version :** 1.0

**Statut :** Draft de référence

**Marché initial :** Madagascar

**Positionnement :** Plateforme d'apprentissage de l'anglais orientée pratique orale

**Plateforme cible :** Web mobile-first / PWA

**Langue principale de l'interface initiale :** Français

**Langue enseignée :** Anglais

> **Learn. Speak. Grow.**
> 

---

# 1. Objet du document

Ce document définit les exigences produit de Lingora.

Il sert de référence commune pour :

- la conception fonctionnelle ;
- la conception UX/UI ;
- le développement frontend ;
- le développement backend ;
- la conception de la base de données ;
- l'intégration de l'IA ;
- la stratégie de test ;
- les futures évolutions du produit.

Le PRD décrit **ce que Lingora doit permettre de faire** et **pourquoi**.

Les choix techniques détaillés seront traités dans un document d'architecture séparé.

---

# 2. Vision produit

Lingora est une plateforme d'apprentissage de l'anglais conçue pour aider les apprenants malgaches à transformer leurs connaissances théoriques en capacité réelle à communiquer.

La plateforme combine :

- contenu pédagogique structuré ;
- exercices ;
- écoute ;
- lecture ;
- pratique orale ;
- évaluation ;
- suivi de progression ;
- intelligence artificielle ;
- accompagnement humain.

La promesse centrale est :

> **Aider les apprenants à parler anglais avec davantage de confiance dans leurs études, leur carrière et leur vie professionnelle.**
> 

Cette orientation est cohérente avec le positionnement défini dans le Business Model Lingora, qui privilégie la progression observable et la pratique orale plutôt que la simple vente d'heures de cours.

---

# 3. Problème utilisateur

## 3.1 Problème principal

Un apprenant peut connaître des règles de grammaire et du vocabulaire sans pour autant être capable de :

- comprendre rapidement une conversation ;
- répondre spontanément ;
- tenir une conversation ;
- s'exprimer professionnellement ;
- prononcer correctement certains mots ;
- utiliser son vocabulaire dans une situation réelle.

Lingora doit donc réduire l'écart entre :

```
Knowledge
     ↓
Practice
     ↓
Confidence
     ↓
Real-world communication
```

---

# 4. Objectif produit

## Objectif principal

Permettre à un utilisateur de développer progressivement une compétence mesurable en anglais à travers un parcours personnalisé combinant apprentissage, pratique et feedback.

---

## Objectifs secondaires

Lingora doit également :

1. rendre l'apprentissage accessible depuis un smartphone ;
2. réduire les contraintes liées à une connexion Internet limitée ;
3. permettre une pratique orale régulière ;
4. offrir un feedback rapide ;
5. permettre au formateur de suivre ses apprenants ;
6. mesurer la progression ;
7. proposer des parcours adaptés aux objectifs professionnels ;
8. permettre progressivement une personnalisation par IA.

---

# 5. Non-objectifs

Lingora ne cherche pas initialement à devenir :

- un réseau social ;
- une marketplace de professeurs ;
- une plateforme généraliste de formation ;
- une plateforme de visioconférence ;
- un remplacement complet du professeur ;
- un clone d'une application internationale existante ;
- une plateforme proposant immédiatement des centaines de parcours.

---

# 6. Principes produit

## P01 — Speaking First

La pratique orale doit occuper une place centrale.

---

## P02 — Progression mesurable

L'utilisateur doit pouvoir constater son évolution.

---

## P03 — Objectif avant contenu

Le contenu doit répondre à un objectif.

Exemple :

```
Objectif :
Réussir un entretien

↓
Parcours

↓
Présentation personnelle
↓
Expérience professionnelle
↓
Questions fréquentes
↓
Simulation
↓
Évaluation
```

---

## P04 — Mobile First

L'expérience principale doit être conçue pour smartphone.

---

## P05 — Low Data

Le produit doit limiter la consommation de données.

---

## P06 — Human + AI

L'IA accompagne l'apprenant mais ne remplace pas l'expertise pédagogique humaine.

---

## P07 — Simple Before Complex

Chaque fonctionnalité doit apporter une valeur identifiable.

---

# 7. Utilisateurs du système

Lingora comporte trois catégories principales.

## 7.1 Student

L'apprenant utilise la plateforme pour :

- apprendre ;
- pratiquer ;
- atteindre ses objectifs ;
- suivre sa progression.

---

## 7.2 Teacher

Le formateur utilise la plateforme pour :

- créer ou gérer du contenu ;
- suivre les apprenants ;
- corriger ;
- donner du feedback ;
- identifier les difficultés.

---

## 7.3 Administrator

L'administrateur gère :

- utilisateurs ;
- contenu ;
- offres ;
- abonnements ;
- paiements ;
- configuration ;
- statistiques ;
- permissions.

---

# 8. Parcours utilisateur global

```
Acquisition
    ↓
Landing Page
    ↓
Inscription
    ↓
Onboarding
    ↓
Placement Test
    ↓
Objectif
    ↓
Learning Path
    ↓
Lessons
    ↓
Practice
    ↓
Speaking
    ↓
Feedback
    ↓
Progress
    ↓
Retention
    ↓
Renewal / Upgrade
```

---

# 9. EPIC 01 — Authentification

## Objectif

Permettre à un utilisateur de créer et gérer son compte.

### Fonctionnalités

- inscription ;
- connexion ;
- déconnexion ;
- récupération du compte ;
- gestion du profil ;
- changement de mot de passe.

### User Stories

**US-AUTH-001**

> En tant qu'utilisateur, je veux créer un compte afin d'utiliser Lingora.
> 

**US-AUTH-002**

> En tant qu'utilisateur, je veux me connecter afin de retrouver ma progression.
> 

**US-AUTH-003**

> En tant qu'utilisateur, je veux récupérer mon accès si j'ai oublié mon mot de passe.
> 

### Critères d'acceptation

- un utilisateur peut créer un compte valide ;
- un compte ne peut pas être créé deux fois avec le même identifiant ;
- les données d'authentification sont sécurisées ;
- une session utilisateur peut être maintenue.

### Priorité

**MVP — P0**

---

# 10. EPIC 02 — Onboarding

## Objectif

Comprendre le profil et l'objectif de l'apprenant.

### Données initiales

- prénom ;
- situation ;
- objectif ;
- niveau estimé ;
- temps disponible ;
- expérience avec l'anglais.

### Situations

```
Student
Employee
Freelancer
Job seeker
Professional
Other
```

### Objectifs

```
Improve speaking
Prepare an interview
English for work
Study
Travel
Business English
General English
```

### User Stories

**US-ONB-001**

> En tant qu'utilisateur, je veux indiquer mon objectif afin que Lingora adapte mon parcours.
> 

**US-ONB-002**

> En tant qu'utilisateur, je veux indiquer le temps que je peux consacrer à l'apprentissage afin que les recommandations soient réalistes.
> 

### Priorité

**MVP — P0**

---

# 11. EPIC 03 — Placement Test

## Objectif

Déterminer le niveau initial de l'apprenant.

### Domaines

- Grammar ;
- Vocabulary ;
- Reading ;
- Listening ;
- Speaking.

### Résultat

Le résultat doit pouvoir être multidimensionnel.

Exemple :

```
Overall: A2

Grammar       B1
Vocabulary    A2
Listening     A2
Speaking      A1
Pronunciation A2
```

### User Stories

**US-TEST-001**

> En tant qu'utilisateur, je veux passer un test afin de connaître mon niveau.
> 

**US-TEST-002**

> En tant qu'utilisateur, je veux connaître mes points forts et mes points faibles.
> 

### Critères d'acceptation

- le test peut être commencé ;
- l'utilisateur peut progresser question par question ;
- les résultats sont enregistrés ;
- un niveau initial est calculé ;
- les résultats peuvent être consultés.

### Priorité

**MVP — P0**

---

# 12. EPIC 04 — Learning Path

## Objectif

Déterminer ce que l'utilisateur doit apprendre.

### Entrées

```
Profile
+
Goal
+
Level
+
Placement Test
+
Performance
```

### Sortie

```
Personalized Learning Path
```

### Exemple

```
Goal: Job Interview

Module 1
Professional vocabulary

Module 2
Introducing yourself

Module 3
Talking about experience

Module 4
Common interview questions

Module 5
Mock interview
```

### User Stories

**US-PATH-001**

> En tant qu'apprenant, je veux recevoir un parcours adapté à mon objectif.
> 

**US-PATH-002**

> En tant qu'apprenant, je veux savoir quelle activité effectuer ensuite.
> 

### Priorité

**MVP — P0**

---

# 13. EPIC 05 — Courses

## Objectif

Permettre l'accès aux contenus pédagogiques.

### Hiérarchie

```
Course
  ↓
Module
  ↓
Lesson
  ↓
Activity
```

### Types de cours initiaux

1. English Start
2. English Speaking
3. English for Career

### User Stories

**US-COURSE-001**

> En tant qu'apprenant, je veux consulter mes cours.
> 

**US-COURSE-002**

> En tant qu'apprenant, je veux reprendre un cours là où je l'ai arrêté.
> 

### Priorité

**MVP — P0**

---

# 14. EPIC 06 — Lessons

## Structure

Une leçon peut contenir :

```
Introduction
↓
Explanation
↓
Vocabulary
↓
Listening
↓
Exercise
↓
Speaking
↓
Assessment
```

### Règle produit

Une leçon doit avoir un objectif pédagogique identifiable.

### Exemple

> À la fin de la leçon, l'apprenant doit pouvoir se présenter professionnellement pendant environ une minute.
> 

### Priorité

**MVP — P0**

---

# 15. EPIC 07 — Vocabulary

## Fonctionnalités

Chaque élément de vocabulaire peut contenir :

- mot ;
- traduction ;
- définition ;
- exemple ;
- audio ;
- prononciation ;
- contexte.

### Actions

- écouter ;
- consulter ;
- pratiquer ;
- ajouter aux favoris ;
- réviser.

### Priorité

**MVP — P1**

---

# 16. EPIC 08 — Grammar

## Objectif

Fournir les connaissances grammaticales nécessaires sans transformer Lingora en plateforme exclusivement grammaticale.

### Structure

```
Concept
↓
Explication courte
↓
Examples
↓
Exercise
↓
Application
```

### Priorité

**MVP — P1**

---

# 17. EPIC 09 — Listening

## Objectif

Développer la compréhension orale.

### Fonctionnalités

- lecteur audio ;
- répétition ;
- vitesse adaptée si nécessaire ;
- questions de compréhension ;
- transcription lorsque pertinente.

### Priorité

**MVP — P1**

---

# 18. EPIC 10 — Speaking Lab

## Objectif

Permettre à l'apprenant de pratiquer l'anglais oralement.

### Modes

```
Free Conversation
Job Interview
Daily Life
Travel
Business
Customer Service
IT
Tourism
```

### Flux

```
Choose scenario
↓
AI prompt
↓
User speaks
↓
Speech-to-text
↓
Analysis
↓
Feedback
↓
Retry
```

### Dimensions analysées

- fluency ;
- grammar ;
- vocabulary ;
- pronunciation ;
- relevance of answer.

### User Story

> En tant qu'apprenant, je veux parler avec une IA afin de pratiquer l'anglais sans avoir besoin d'attendre un cours.
> 

### Priorité

**MVP limité — P0**

La première version peut proposer seulement quelques scénarios.

---

# 19. EPIC 11 — AI Conversation

## Objectif

Permettre des conversations adaptées au niveau.

### Exemple

### A1

> What is your name?
> 

### A2

> What do you do every day?
> 

### B1

> Tell me about a challenge you faced at work.
> 

### B2

> How would you handle a disagreement with an international client?
> 

### Règle

L'IA doit adapter :

- vocabulaire ;
- longueur ;
- complexité ;
- vitesse ;
- niveau des questions.

### Priorité

**V1**

---

# 20. EPIC 12 — AI Feedback

## Objectif

Transformer une réponse utilisateur en feedback pédagogique.

### Exemple

```
Your answer

"I am agree with this idea."

Correction

"I agree with this idea."

Explanation

"Agree" does not normally use "am".
```

### Feedback

```
Grammar      ✓
Vocabulary   ✓
Fluency      ⚠
Pronunciation ✓
```

### Priorité

**V1**

---

# 21. EPIC 13 — Progress Tracking

## Objectif

Mesurer l'évolution de l'apprenant.

### Dimensions

```
Grammar
Vocabulary
Listening
Reading
Speaking
Pronunciation
Fluency
```

### Historique

Le système doit conserver les résultats afin de pouvoir comparer :

```
Initial assessment
        ↓
Current assessment
        ↓
Progress
```

### Priorité

**MVP — P0**

---

# 22. EPIC 14 — Goals

## Objectif

Permettre à l'apprenant de travailler vers un objectif concret.

### Exemple

```
Goal
Become confident in English

Current
A2

Target
B1

Deadline
12 weeks
```

### User Story

> En tant qu'apprenant, je veux définir un objectif afin de savoir pourquoi et vers quoi j'apprends.
> 

### Priorité

**MVP — P0**

---

# 23. EPIC 15 — Daily Practice

## Objectif

Créer une habitude.

### Exemple

```
Today's Practice

Vocabulary      5 min
Listening       5 min
Speaking        5 min
```

### Principes

La session doit être réalisable même avec peu de temps.

### Durées

```
5 min
10 min
20 min
30+ min
```

### Priorité

**MVP — P1**

---

# 24. EPIC 16 — Gamification

## Fonctionnalités initiales

- streak ;
- XP ;
- badges ;
- objectifs hebdomadaires.

### Règle

La gamification soutient l'apprentissage.

Elle ne doit pas devenir l'objectif principal.

### Priorité

**V1 — P1**

---

# 25. EPIC 17 — Offline / Low Connectivity

## Objectif

Permettre l'apprentissage malgré une connexion instable.

### Fonctionnalités

- téléchargement des contenus ;
- cache ;
- mode offline ;
- synchronisation ultérieure.

### Exemple

```
Online
↓
Download Lesson
↓
Offline
↓
Complete Lesson
↓
Connection restored
↓
Sync
```

### Priorité

**V1**

---

# 26. EPIC 18 — Teacher Dashboard

## Objectif

Permettre au formateur de suivre les apprenants.

### Dashboard

Afficher :

- nombre d'apprenants ;
- apprenants actifs ;
- progression moyenne ;
- apprenants nécessitant une attention.

### Priorité

**MVP — P0**

---

# 27. EPIC 19 — Student Management

Le formateur peut :

- consulter les étudiants ;
- filtrer ;
- consulter une fiche ;
- voir la progression ;
- consulter les activités ;
- donner un feedback.

### Priorité

**MVP — P0**

---

# 28. EPIC 20 — Teacher Feedback

Le formateur peut ajouter :

- commentaire ;
- correction ;
- recommandation ;
- exercice.

### Principe

L'IA peut assister le formateur mais celui-ci conserve le contrôle pédagogique.

### Priorité

**MVP — P1**

---

# 29. EPIC 21 — Content Management

L'administrateur / formateur doit pouvoir gérer :

```
Courses
Modules
Lessons
Activities
Exercises
Vocabulary
Audio
Assessments
```

### Priorité

**MVP — P0**

---

# 30. EPIC 22 — Subscription

Le système doit gérer les offres.

### États

```
Pending
Active
Paused
Expired
Cancelled
```

### Données

- offre ;
- utilisateur ;
- date de début ;
- date d'expiration ;
- statut.

### Priorité

**MVP — P0**

---

# 31. EPIC 23 — Payment

### Flux

```
Choose Offer
↓
Payment
↓
Pending
↓
Confirmation
↓
Active Subscription
```

### États

```
Pending
Successful
Failed
Cancelled
Refunded
```

### Priorité

**MVP — P0**

---

# 32. EPIC 24 — Notifications

### Types

- nouvelle leçon ;
- rappel ;
- objectif ;
- feedback ;
- progression ;
- abonnement.

### Canaux potentiels

```
In-app
Email
WhatsApp
```

WhatsApp pourra être développé progressivement.

### Priorité

**MVP limité / V1**

---

# 33. EPIC 25 — Analytics

## Produit

Mesurer :

- utilisateurs actifs ;
- sessions ;
- cours commencés ;
- cours terminés ;
- speaking sessions ;
- progression.

## Business

Mesurer :

- inscriptions ;
- conversion ;
- abonnements ;
- churn ;
- rétention.

## Pédagogie

Mesurer :

- progression moyenne ;
- amélioration speaking ;
- amélioration listening ;
- completion ;
- fréquence de pratique.

---

# 34. EPIC 26 — Corporate

Hors MVP.

Une entreprise pourra disposer de :

```
Organization
│
├── Employees
├── Programs
├── Assignments
├── Assessments
└── Reports
```

### Priorité

**V3**

---

# 35. EPIC 27 — International / Diaspora

Hors MVP.

Possibilité future :

- Malgaches vivant à l'étranger ;
- utilisateurs francophones ;
- nouvelles offres ;
- nouvelles localisations.

### Priorité

**V3+**

---

# 36. Matrice des priorités

| Fonctionnalité | MVP | V1 | V2 | V3 |
| --- | --- | --- | --- | --- |
| Authentification | P0 |  |  |  |
| Onboarding | P0 |  |  |  |
| Placement Test | P0 |  |  |  |
| Learning Path | P0 |  |  |  |
| Courses | P0 |  |  |  |
| Lessons | P0 |  |  |  |
| Vocabulary | P1 |  |  |  |
| Grammar | P1 |  |  |  |
| Listening | P1 |  |  |  |
| Speaking Lab | P0 limité | P0 complet |  |  |
| AI Conversation |  | P0 |  |  |
| AI Feedback |  | P0 |  |  |
| Progress | P0 |  |  |  |
| Goals | P0 |  |  |  |
| Daily Practice | P1 |  |  |  |
| Gamification |  | P1 |  |  |
| Offline |  | P0 |  |  |
| Teacher Dashboard | P0 |  |  |  |
| Teacher Feedback | P1 |  |  |  |
| CMS pédagogique | P0 |  |  |  |
| Subscription | P0 |  |  |  |
| Payment | P0 |  |  |  |
| Notifications | P1 |  |  |  |
| Analytics | P1 |  |  |  |
| Corporate |  |  |  | P0 |
| Diaspora |  |  |  | P1 |

---

# 37. MVP — Définition finale

Le MVP Lingora doit permettre à un utilisateur de :

```
1. Créer un compte
        ↓
2. Définir son objectif
        ↓
3. Passer un test
        ↓
4. Obtenir un niveau
        ↓
5. Recevoir un parcours
        ↓
6. Suivre des leçons
        ↓
7. Faire des exercices
        ↓
8. Pratiquer l'oral
        ↓
9. Voir ses résultats
        ↓
10. Recevoir du feedback
```

Et au formateur de :

```
1. Voir les étudiants
        ↓
2. Voir leur progression
        ↓
3. Consulter leurs performances
        ↓
4. Ajouter du feedback
        ↓
5. Gérer le contenu
```

---

# 38. Critères de succès du MVP

Le MVP ne sera pas considéré comme réussi simplement parce que toutes les fonctionnalités sont développées.

Il doit permettre de mesurer :

### Activation

Un nouvel utilisateur :

> crée son compte → termine son onboarding → passe son test.
> 

### Engagement

Il :

> revient → apprend → pratique.
> 

### Speaking

Il :

> effectue régulièrement des exercices oraux.
> 

### Progression

Ses performances :

> évoluent dans le temps.
> 

### Rétention

Il :

> continue à utiliser Lingora après plusieurs semaines.
> 

### Conversion

Une partie des utilisateurs :

> choisit une offre payante lorsque celle-ci est proposée.
> 

---

# 39. North Star Metric

La métrique centrale proposée pour Lingora :

> **Nombre d'apprenants actifs ayant démontré une progression mesurable sur une compétence d'anglais.**
> 

Cette métrique évite de considérer uniquement :

- les inscriptions ;
- les téléchargements ;
- les minutes passées ;
- les vidéos regardées.

Lingora doit mesurer avant tout :

> **l'apprentissage réel.**
> 

---

# 40. Métriques secondaires

## Engagement

- DAU ;
- WAU ;
- MAU ;
- sessions par semaine ;
- minutes d'apprentissage ;
- streak.

## Learning

- progression par compétence ;
- speaking improvement ;
- listening improvement ;
- completion rate ;
- assessment score.

## Business

- conversion ;
- ARPU ;
- CAC ;
- churn ;
- LTV ;
- MRR.

---

# 41. Règles métier fondamentales

## BR-001 — Progression

Une activité terminée doit pouvoir contribuer à la progression de l'apprenant.

---

## BR-002 — Niveau

Le niveau global ne doit pas nécessairement être identique au niveau de chaque compétence.

---

## BR-003 — Objectif

Un utilisateur peut avoir un objectif principal et éventuellement des objectifs secondaires.

---

## BR-004 — Parcours

Un parcours doit pouvoir être adapté aux performances.

---

## BR-005 — IA

Une recommandation IA ne doit pas modifier silencieusement une donnée pédagogique critique.

---

## BR-006 — Formateur

Le formateur doit pouvoir intervenir sur le parcours d'un apprenant.

---

## BR-007 — Paiement

Un abonnement n'est actif qu'après confirmation du paiement selon la méthode utilisée.

---

## BR-008 — Offline

Les données générées hors connexion doivent être synchronisées sans écraser incorrectement les données serveur.

---

# 42. Contraintes produit

## Contraintes techniques

- mobile-first ;
- faible consommation ;
- architecture scalable ;
- séparation frontend/backend ;
- API-first ;
- services IA découplés.

## Contraintes commerciales

Les prix et KPI doivent être considérés comme des hypothèses tant qu'ils n'ont pas été validés par le marché.

Le Business Model actuel recommande explicitement de valider avant d'investir massivement dans une plateforme propriétaire.

## Contraintes pédagogiques

Le contenu doit être conçu ou validé par une personne compétente en enseignement de l'anglais.

---

# 43. Dépendances

Certaines fonctionnalités dépendent de services externes :

```
Speech-to-Text
Text-to-Speech
LLM
Payment Provider
Email
WhatsApp
Storage
Analytics
```

Chaque dépendance devra avoir :

- un fournisseur principal ;
- éventuellement un fournisseur alternatif ;
- un coût estimé ;
- une limite d'utilisation ;
- une stratégie de fallback.

---

# 44. Risques produit

| Risque | Impact | Réponse |
| --- | --- | --- |
| Produit trop complexe | Élevé | MVP strict |
| Faible rétention | Élevé | Daily Practice + objectifs |
| IA coûteuse | Élevé | limites + optimisation |
| Connexion faible | Élevé | PWA + offline |
| Contenu insuffisant | Élevé | priorité au contenu |
| Feedback IA incorrect | Élevé | validation pédagogique |
| Abandon des apprenants | Élevé | suivi formateur |
| Paiement compliqué | Élevé | intégration locale |
| Dépendance fournisseur IA | Moyen | abstraction AI Provider |

---

# 45. Questions encore ouvertes

Les points suivants doivent être décidés avant la conception technique finale :

### Pédagogie

- Quelle méthode pédagogique exacte ?
- Comment calculer le niveau ?
- Quel référentiel utiliser ?
- Comment mesurer la progression orale ?
- Quelle durée idéale pour une leçon ?

### Business

- Abonnement mensuel ou paiement par cycle ?
- Quelle offre gratuite ?
- Quelle limite IA ?
- Quels tarifs définitifs ?

### IA

- Quel fournisseur Speech-to-Text ?
- Quel fournisseur LLM ?
- Quel Text-to-Speech ?
- Comment évaluer la prononciation ?
- Quel coût maximal par utilisateur ?

### Technique

- Quel fournisseur cloud ?
- Quel stockage ?
- Quelle stratégie offline ?
- Quel système de notifications ?
- Quelle solution de paiement ?

---

# 46. Décisions à prendre avant le développement

Les décisions suivantes doivent être validées :

```
[ ] Référentiel de niveau
[ ] Structure pédagogique
[ ] MVP exact
[ ] Parcours initiaux
[ ] Méthode d'évaluation
[ ] Speaking MVP
[ ] Fournisseur IA
[ ] Paiement
[ ] Stratégie offline
[ ] Design System
[ ] Architecture technique
[ ] Base PostgreSQL
```

---

# 47. Ordre recommandé pour la suite du projet

Le PRD étant maintenant défini, la suite logique est :

```
PRD
 │
 ↓
Cahier des charges fonctionnel
 │
 ↓
Architecture fonctionnelle
 │
 ↓
Modèle de données
 │
 ↓
PostgreSQL
 │
 ↓
Architecture Backend
 │
 ↓
Architecture Frontend
 │
 ↓
Architecture IA
 │
 ↓
UX/UI
 │
 ↓
Plan de développement
 │
 ↓
MVP
```

---

# 48. Document suivant

Le prochain document à produire est :

# LINGORA — Cahier des Charges Fonctionnel

Il devra transformer chaque EPIC du présent PRD en spécifications beaucoup plus précises.

Pour chaque fonctionnalité :

```
ID
Nom
Objectif
Acteur
Préconditions
Déclencheur
Workflow
Données entrantes
Traitement
Résultat
Règles métier
Cas nominaux
Cas d'erreur
Permissions
Critères d'acceptation
Priorité
Dépendances
```

Le cahier des charges fonctionnel servira ensuite directement de base à la conception technique.

---

# 49. Principe directeur final

> **Ne pas construire la plus grosse plateforme possible.**
> 
> 
> **Construire la plus petite plateforme capable de démontrer que Lingora améliore réellement la capacité d'un apprenant à utiliser l'anglais.**
> 

**LINGORA**

> Learn. Speak. Grow.
>