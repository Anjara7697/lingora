# LINGORA - Cahier des Charges -3

## Cahier des Charges Fonctionnel — CDC v1.0

**Produit :** Lingora

**Version :** 1.0

**Type :** Plateforme EdTech d'apprentissage de l'anglais

**Marché initial :** Madagascar

**Canal principal :** Web / PWA mobile-first

**Langue de l'interface :** Français

**Langue enseignée :** Anglais

**Statut :** Conception fonctionnelle

**Document de référence :** PRD Lingora v1.0

---

# 1. Objet du document

Ce cahier des charges décrit de manière fonctionnelle le comportement attendu de la plateforme Lingora.

Il constitue le document de référence permettant de passer :

**Vision produit → Fonctionnalités → Interfaces → Architecture technique → Base de données → Développement → Tests → Mise en production**

Le document ne définit pas encore les détails d'implémentation technique tels que les classes, composants React, endpoints précis ou requêtes SQL.

Ces éléments seront définis dans les documents techniques suivants.

---

# 2. Vision fonctionnelle

Lingora est une plateforme d'apprentissage de l'anglais orientée vers une progression réellement observable.

Le produit ne doit pas être conçu comme une simple bibliothèque de cours vidéo.

Le parcours central doit être :

> **Apprendre → Pratiquer → Parler → Recevoir un feedback → Corriger → Recommencer → Mesurer → Progresser**
> 

Le produit doit particulièrement valoriser la pratique orale.

Le programme phare envisagé est **English Speaking**, construit autour de la conversation et de la pratique, avec une durée de référence de 12 semaines. Le programme prévoit une progression allant de la confiance personnelle à la conversation puis aux situations professionnelles.

---

# 3. Objectifs fonctionnels

La plateforme doit permettre de :

1. créer et gérer un compte apprenant ;
2. déterminer le niveau initial de l'apprenant ;
3. identifier ses objectifs d'apprentissage ;
4. générer ou attribuer un parcours adapté ;
5. suivre des cours et des leçons ;
6. pratiquer vocabulaire, grammaire et compréhension ;
7. pratiquer l'expression orale ;
8. recevoir des corrections et feedbacks ;
9. suivre sa progression ;
10. définir et suivre des objectifs ;
11. permettre au professeur de suivre ses apprenants ;
12. permettre au professeur d'intervenir pédagogiquement ;
13. administrer les contenus ;
14. gérer les offres et abonnements ;
15. enregistrer les paiements ;
16. gérer les notifications ;
17. produire des indicateurs de progression et d'activité.

---

# 4. Périmètre fonctionnel

## 4.1 MVP

Le MVP doit couvrir :

- Landing Page
- Inscription
- Connexion
- Onboarding
- Test de niveau
- Résultat du test
- Objectifs
- Parcours d'apprentissage
- Cours
- Leçons
- Exercices
- Vocabulaire
- Grammaire
- Listening
- Speaking
- Feedback
- Progression
- Profil
- Dashboard apprenant
- Dashboard professeur
- Gestion des apprenants
- Gestion de contenu de base

## 4.2 V1

La V1 pourra ajouter :

- conversation IA avancée ;
- personnalisation du parcours ;
- objectifs avancés ;
- gamification ;
- notifications avancées ;
- abonnements ;
- paiements intégrés ;
- analytics avancés ;
- fonctionnement optimisé en faible connectivité.

## 4.3 V2

La V2 pourra intégrer :

- mode offline ;
- fonctionnalités AI avancées ;
- recommandations pédagogiques ;
- CRM ;
- automatisations ;
- programmes professionnels avancés.

## 4.4 V3

La V3 pourra intégrer :

- offres Corporate ;
- gestion d'organisations ;
- gestion de groupes d'employés ;
- programmes spécifiques aux entreprises ;
- fonctionnalités internationales / diaspora.

Le modèle économique de référence prévoit effectivement une évolution ultérieure vers le Corporate puis l'international, après validation du marché local.

---

# 5. Acteurs

## 5.1 Visiteur

Utilisateur non authentifié.

Peut :

- consulter le site ;
- consulter les offres ;
- découvrir Lingora ;
- effectuer éventuellement un test gratuit ;
- créer un compte.

---

## 5.2 Apprenant

Utilisateur principal de la plateforme.

Peut :

- gérer son profil ;
- passer un test de niveau ;
- consulter son parcours ;
- suivre ses cours ;
- réaliser des exercices ;
- pratiquer l'oral ;
- consulter ses corrections ;
- suivre sa progression ;
- définir ses objectifs ;
- consulter son historique.

---

## 5.3 Enseignant

Utilisateur pédagogique.

Peut :

- consulter les apprenants autorisés ;
- consulter leur progression ;
- consulter leurs performances ;
- ajouter du feedback ;
- suivre les résultats ;
- gérer certains contenus selon ses permissions.

---

## 5.4 Administrateur

Responsable de la plateforme.

Peut :

- gérer les utilisateurs ;
- gérer les enseignants ;
- gérer les contenus ;
- gérer les programmes ;
- gérer les offres ;
- consulter les statistiques ;
- gérer les paramètres ;
- administrer les permissions.

---

# 6. Principes fonctionnels

## PF-01 — Mobile First

La plateforme doit être utilisable prioritairement depuis un smartphone.

---

## PF-02 — Faible consommation de données

Les fonctionnalités essentielles doivent rester utilisables avec une connexion limitée.

Les médias lourds doivent être optimisés.

---

## PF-03 — Speaking First

L'expression orale doit être une composante centrale et non une fonctionnalité secondaire.

---

## PF-04 — Progression mesurable

Le système doit pouvoir comparer les performances d'un apprenant dans le temps.

---

## PF-05 — Human + AI

L'IA assiste l'apprentissage et le feedback.

Elle ne doit pas supprimer le rôle pédagogique de l'enseignant.

---

## PF-06 — Contexte malgache

Les situations proposées doivent pouvoir correspondre aux réalités des apprenants :

- études ;
- recherche d'emploi ;
- entretien ;
- travail ;
- relation client ;
- tourisme ;
- IT ;
- freelance ;
- communication internationale.

---

# 7. Architecture fonctionnelle globale

```
                    LINGORA
                       │
        ┌──────────────┼──────────────┐
        │              │              │
     VISITEUR      APPRENANT      ENSEIGNANT
        │              │              │
     Landing       Dashboard      Dashboard
        │              │              │
     Inscription    Parcours      Apprenants
        │              │              │
     Test niveau    Cours         Feedback
        │              │              │
        └──────────────┼──────────────┘
                       │
                  MOTEUR PÉDAGOGIQUE
                       │
          ┌────────────┼────────────┐
          │            │            │
       Contenus     Exercices      IA
          │            │            │
          └────────────┼────────────┘
                       │
                  PROGRESSION
                       │
                 ANALYTICS / ADMIN
```

---

# 8. Fonctionnalités détaillées

# F01 — Landing Page

### Objectif

Présenter Lingora et convertir un visiteur en prospect ou apprenant.

### Acteur

Visiteur.

### Entrée

Accès à l'URL publique de Lingora.

### Fonctionnalités

La page doit présenter :

- proposition de valeur ;
- présentation de Lingora ;
- bénéfices ;
- programmes ;
- fonctionnement ;
- résultats / progression ;
- témoignages lorsque disponibles ;
- présentation de l'équipe ;
- FAQ ;
- appel à l'action ;
- inscription ;
- test de niveau.

### CTA principal

Le test de niveau gratuit constitue un CTA prioritaire dans le tunnel envisagé.

### Critères d'acceptation

- La page est responsive.
- Le parcours vers l'inscription est accessible.
- Le test de niveau est accessible.
- Les offres sont compréhensibles.
- Les informations essentielles sont visibles sur mobile.

### Priorité

**MVP**

---

# F02 — Inscription

### Objectif

Créer un compte apprenant.

### Données minimales

- prénom ;
- nom ;
- email ;
- mot de passe ;
- confirmation du mot de passe.

### Fonctionnement

```
Visiteur
   ↓
Inscription
   ↓
Validation des données
   ↓
Création du compte
   ↓
Connexion automatique
   ↓
Onboarding
```

### Règles

- email unique ;
- mot de passe sécurisé ;
- validation des champs ;
- compte créé avec rôle `STUDENT` par défaut.

### Cas d'erreur

- email déjà utilisé ;
- email invalide ;
- mot de passe insuffisant ;
- champs obligatoires manquants.

### Priorité

**MVP**

---

# F03 — Connexion

### Fonctionnalités

- email + mot de passe ;
- récupération du mot de passe ;
- maintien de session ;
- déconnexion.

### Critères

Un utilisateur authentifié doit être redirigé vers son espace correspondant à son rôle.

### Priorité

**MVP**

---

# F04 — Onboarding

### Objectif

Comprendre rapidement le profil et les objectifs de l'apprenant.

### Étapes

```
Bienvenue
   ↓
Profil
   ↓
Objectif principal
   ↓
Situation actuelle
   ↓
Disponibilité
   ↓
Test de niveau
```

### Objectifs possibles

- apprendre l'anglais ;
- améliorer son oral ;
- études ;
- carrière ;
- entretien ;
- travail ;
- voyage ;
- communication professionnelle.

Les catégories doivent rester configurables.

### Règle

L'objectif déclaré doit influencer les recommandations pédagogiques.

### Priorité

**MVP**

---

# F05 — Test de niveau

### Objectif

Évaluer le niveau initial de l'apprenant.

### Composantes possibles

- vocabulaire ;
- grammaire ;
- compréhension écrite ;
- compréhension orale ;
- expression écrite ;
- expression orale.

Le niveau ne doit pas être réduit à un seul score si plusieurs compétences sont disponibles.

### Fonctionnement

```
Début test
   ↓
Questions
   ↓
Validation
   ↓
Évaluation
   ↓
Calcul des résultats
   ↓
Profil de niveau
```

### Données conservées

- date ;
- réponses ;
- score ;
- compétences ;
- niveau ;
- durée ;
- version du test.

### Règle importante

Un résultat de test doit rester historisé.

Une nouvelle évaluation ne doit pas écraser silencieusement l'ancienne.

### Priorité

**MVP**

---

# F06 — Résultat du test

### Objectif

Présenter le niveau de manière compréhensible.

### Affichage

Exemple :

```
Votre niveau estimé

Global : B1

Expression orale : B1
Compréhension orale : B1
Grammaire : A2
Vocabulaire : B1

Point fort :
Compréhension

À améliorer :
Expression orale
```

### Actions

- commencer le parcours ;
- consulter les recommandations ;
- définir les objectifs.

### Règle

Le résultat doit être pédagogique et non présenté comme une certification officielle.

Le document business prévoit explicitement que le certificat Lingora doit être présenté comme un certificat interne et non comme une certification internationale.

### Priorité

**MVP**

---

# F07 — Dashboard apprenant

### Objectif

Donner une vision immédiate de la situation de l'apprenant.

### Contenu

- progression générale ;
- cours actuel ;
- prochaine activité ;
- objectif ;
- série d'apprentissage ;
- compétences ;
- derniers résultats ;
- recommandations ;
- accès rapide au Speaking Lab.

### Exemple

```
Bonjour Anjara 👋

Votre objectif
Parler anglais avec plus de confiance

Progression
████████░░ 72 %

Aujourd'hui
▶ Speaking Practice

Continuer
English Speaking — Week 6

Compétences
Speaking      68 %
Listening     74 %
Vocabulary    71 %
Grammar       62 %
```

### Priorité

**MVP**

---

# F08 — Catalogue des programmes

### Objectif

Présenter les différents programmes disponibles.

### Exemple

- English Start
- English Speaking
- English for Career
- English 1:1 Premium
- Corporate English

Les offres et tarifs actuellement documentés sont des hypothèses commerciales et restent à valider avant implémentation définitive.

### Priorité

**MVP**

---

# F09 — Learning Path

### Objectif

Afficher le parcours pédagogique de l'apprenant.

### Structure

```
Programme
 ├── Module 1
 │    ├── Lesson
 │    ├── Exercise
 │    └── Speaking
 │
 ├── Module 2
 │    ├── Lesson
 │    ├── Exercise
 │    └── Speaking
 │
 └── Module 3
      ├── Lesson
      ├── Exercise
      └── Speaking
```

### Statuts

- Locked
- Available
- In Progress
- Completed

### Règle

Une activité peut dépendre d'une activité précédente.

---

# F10 — Cours

### Objectif

Présenter le contenu pédagogique d'un programme.

### Informations

- titre ;
- description ;
- niveau ;
- durée ;
- objectifs ;
- modules ;
- progression.

---

# F11 — Lesson

### Objectif

Permettre l'apprentissage d'une notion.

### Types

- texte ;
- vidéo ;
- audio ;
- image ;
- exemple ;
- dialogue ;
- exercice ;
- activité orale.

### Structure recommandée

```
Introduction
↓
Concept
↓
Exemples
↓
Pratique
↓
Speaking
↓
Évaluation
```

---

# F12 — Exercices

### Types d'exercices

- QCM ;
- texte à compléter ;
- association ;
- traduction ;
- remise en ordre ;
- écoute ;
- choix audio ;
- réponse libre ;
- prononciation.

### Fonctionnement

Chaque réponse doit pouvoir être enregistrée.

### Résultat

- correct ;
- incorrect ;
- explication ;
- correction ;
- score.

### Règle

L'apprenant doit pouvoir refaire certaines activités.

---

# F13 — Vocabulaire

### Fonctionnalités

- découverte ;
- mémorisation ;
- révision ;
- recherche ;
- favoris ;
- répétition.

### Informations

- mot ;
- traduction ;
- définition ;
- exemple ;
- audio ;
- catégorie ;
- niveau.

---

# F14 — Grammaire

### Fonctionnalités

- notion ;
- explication ;
- exemple ;
- exercices ;
- erreurs fréquentes ;
- révision.

---

# F15 — Listening Lab

### Objectif

Développer la compréhension orale.

### Fonctionnalités

- audio ;
- transcription ;
- questions ;
- répétition ;
- vitesse configurable ;
- correction.

---

# F16 — Speaking Lab

### Fonctionnalité centrale de Lingora.

### Objectif

Permettre à l'apprenant de pratiquer son anglais oralement.

### Fonctionnement

```
Choisir une situation
        ↓
Écouter / lire le contexte
        ↓
Répondre à l'oral
        ↓
Enregistrement
        ↓
Analyse
        ↓
Feedback
        ↓
Nouvelle tentative
```

### Situations

Exemples :

- se présenter ;
- entretien d'embauche ;
- appel professionnel ;
- réunion ;
- présentation ;
- voyage ;
- hôtel ;
- restaurant ;
- client ;
- conversation quotidienne.

### Feedback possible

- prononciation ;
- fluidité ;
- vocabulaire ;
- grammaire ;
- pertinence ;
- structure de réponse.

### Priorité

**MVP / Fonction stratégique**

---

# F17 — AI Conversation

### Objectif

Permettre une conversation interactive en anglais.

### Fonctionnement

L'IA joue un rôle défini :

```
Interviewer
Client
Collègue
Manager
Réceptionniste
Voyageur
Professeur
```

L'apprenant répond.

L'IA poursuit la conversation.

### Règles

L'IA doit :

- respecter le scénario ;
- rester au niveau adapté ;
- éviter de donner immédiatement la réponse ;
- favoriser la production de l'apprenant ;
- fournir un feedback après la session.

---

# F18 — AI Feedback

### Objectif

Analyser la performance de l'apprenant.

### Exemple

```
Votre réponse était compréhensible.

Prononciation
★★★★☆
Bonne

Fluidité
★★★☆☆
Quelques hésitations

Grammaire
★★★☆☆
2 erreurs importantes

Vocabulaire
★★★★☆
Bonne variété

Conseil
Essayez de répondre avec des phrases
plus longues et utilisez "because" pour
expliquer vos idées.
```

### Règle

L'IA doit distinguer :

- erreur ;
- suggestion ;
- préférence stylistique.

Elle ne doit pas présenter une suggestion comme une erreur certaine.

---

# F19 — Progression

### Objectif

Mesurer l'évolution de l'apprenant.

### Dimensions

- niveau global ;
- speaking ;
- listening ;
- vocabulary ;
- grammar ;
- writing ;
- activité ;
- objectifs.

### Historique

```
Test initial
      ↓
Évaluation 1
      ↓
Évaluation 2
      ↓
Évaluation finale
```

### Visualisations

- progression ;
- évolution des scores ;
- compétences ;
- activités réalisées ;
- temps de pratique.

---

# F20 — Objectifs

### Objectif

Permettre à l'apprenant de définir ce qu'il souhaite atteindre.

### Exemple

```
Objectif principal :
Réussir un entretien en anglais

Date cible :
15 décembre

Compétence prioritaire :
Speaking

Fréquence :
20 min / jour
```

### Suivi

L'application doit indiquer :

- progression ;
- activités réalisées ;
- retard éventuel ;
- recommandation.

---

# F21 — Daily Practice

### Objectif

Créer une habitude quotidienne.

### Contenu

Chaque jour, le système peut proposer :

- 5 mots ;
- une question ;
- un exercice ;
- une écoute ;
- une réponse orale.

### Règle

La pratique quotidienne doit être courte et adaptée au contexte mobile.

---

# F22 — Gamification

### Fonctionnalités possibles

- streak ;
- XP ;
- badges ;
- objectifs ;
- niveaux ;
- challenges.

### Règle

La gamification doit soutenir l'apprentissage.

Elle ne doit pas devenir l'objectif principal du produit.

### Priorité

**V1**

---

# F23 — Profil apprenant

### Données

- identité ;
- email ;
- photo ;
- langue ;
- niveau ;
- objectifs ;
- préférences ;
- disponibilité.

### Actions

- modifier ;
- changer mot de passe ;
- gérer préférences ;
- consulter historique.

---

# F24 — Notifications

### Types

- nouvelle activité ;
- rappel ;
- objectif ;
- résultat ;
- feedback professeur ;
- progression ;
- paiement ;
- renouvellement.

### Canaux

À terme :

- notification web ;
- email ;
- WhatsApp.

Les canaux réellement disponibles dépendront des intégrations retenues.

---

# F25 — Dashboard enseignant

### Objectif

Donner au professeur une vue pédagogique de ses apprenants.

### Informations

- nombre d'apprenants ;
- activité ;
- progression ;
- niveaux ;
- difficultés ;
- dernières activités ;
- alertes.

### Exemple

```
Mes apprenants

15 actifs

8 → progression normale
4 → faible activité
2 → difficulté Speaking
1 → inactif
```

---

# F26 — Gestion des apprenants

### Fonctionnalités

- liste ;
- recherche ;
- filtres ;
- fiche apprenant ;
- historique ;
- progression ;
- résultats ;
- activités ;
- feedback.

### Fiche apprenant

```
Profil
Niveau
Objectifs
Programme
Progression
Compétences
Historique
Activités
Feedback
```

---

# F27 — Feedback enseignant

### Objectif

Permettre au professeur de compléter le feedback généré automatiquement.

### Fonctionnalités

- commentaire ;
- correction ;
- recommandation ;
- validation ;
- annotation.

### Principe

Le feedback enseignant est considéré comme une donnée pédagogique prioritaire.

---

# F28 — Gestion des contenus

### Acteur

Administrateur / enseignant autorisé.

### CRUD

- créer ;
- consulter ;
- modifier ;
- publier ;
- archiver.

### Contenus

- programmes ;
- modules ;
- cours ;
- lessons ;
- exercices ;
- vocabulaire ;
- audio ;
- scénarios Speaking.

### Statuts

- Draft
- Review
- Published
- Archived

### Règle

Un contenu publié ne doit pas être supprimé brutalement s'il est utilisé dans des parcours existants.

Il doit être archivé ou versionné.

---

# F29 — Gestion des programmes

### Structure

```
Programme
 ├── Niveau
 ├── Objectif
 ├── Modules
 │    ├── Lessons
 │    ├── Exercises
 │    └── Speaking Activities
 └── Evaluations
```

### Exemple

**English Speaking — 12 semaines**

Mois 1 — Confiance

- présentation ;
- famille ;
- travail ;
- loisirs ;
- questions/réponses ;
- prononciation.

Mois 2 — Conversation

- voyage ;
- téléphone ;
- achats ;
- opinions ;
- problèmes ;
- discussions.

Mois 3 — Professionnel

- réunions ;
- présentations ;
- emails ;
- appels ;
- entretiens ;
- clients ;
- négociation.

Cette structure provient du programme de référence fourni dans le business model.

---

# F30 — Abonnements

### Objectif

Gérer l'accès aux offres payantes.

### Modèle

```
User
 ↓
Subscription
 ↓
Plan
 ↓
Entitlements
 ↓
Features accessibles
```

### Informations

- offre ;
- date de début ;
- date de fin ;
- statut ;
- renouvellement ;
- historique.

### Statuts

- Pending
- Active
- Expired
- Cancelled
- Suspended

---

# F31 — Paiements

### Objectif

Enregistrer et suivre les paiements.

### Informations

- utilisateur ;
- montant ;
- devise ;
- méthode ;
- référence ;
- date ;
- statut ;
- abonnement associé.

### Statuts

- Pending
- Paid
- Failed
- Cancelled
- Refunded

### Important

Le moyen de paiement définitif doit être validé avant l'implémentation.

Le business model prévoit actuellement Mobile Money dans le tunnel de vente.

---

# F32 — Administration

### Fonctionnalités

- utilisateurs ;
- rôles ;
- permissions ;
- programmes ;
- contenus ;
- offres ;
- paiements ;
- statistiques ;
- paramètres.

---

# F33 — Analytics

### Objectif

Permettre de comprendre :

- acquisition ;
- activation ;
- apprentissage ;
- engagement ;
- progression ;
- conversion ;
- rétention.

### KPI produit

Le KPI central proposé est :

> Nombre d'apprenants actifs ayant démontré une progression mesurable sur une compétence d'anglais.
> 

### KPI secondaires

- taux d'activation ;
- nombre de sessions ;
- temps de pratique ;
- speaking sessions ;
- taux de complétion ;
- progression ;
- rétention.

Le business model identifie notamment la rétention et la progression comme des indicateurs essentiels à piloter.

---

# 9. Règles métier

## RB-01 — Niveau

Un apprenant possède un niveau global ainsi que, lorsque les données sont disponibles, des niveaux par compétence.

---

## RB-02 — Historisation

Les évaluations doivent être historisées.

---

## RB-03 — Progression

La progression doit être calculée à partir de données réelles d'apprentissage.

Une activité simplement ouverte ne doit pas être considérée comme maîtrisée.

---

## RB-04 — Complétion

Une activité est considérée comme terminée uniquement lorsque ses critères de complétion sont atteints.

---

## RB-05 — Prérequis

Certaines activités peuvent nécessiter la complétion d'activités précédentes.

---

## RB-06 — IA

L'IA peut recommander ou analyser mais ne doit pas modifier silencieusement les données pédagogiques critiques.

---

## RB-07 — Enseignant

Un enseignant doit pouvoir consulter les données pédagogiques nécessaires à son accompagnement.

---

## RB-08 — Permissions

Chaque rôle possède des permissions distinctes.

---

## RB-09 — Contenu

Un contenu utilisé par des apprenants ne doit pas être supprimé physiquement sans gestion de dépendances.

---

## RB-10 — Paiement

L'accès aux fonctionnalités premium dépend du statut de l'abonnement.

---

# 10. Permissions

| Fonction | Visiteur | Étudiant | Enseignant | Admin |
| --- | --- | --- | --- | --- |
| Landing | ✓ | ✓ | ✓ | ✓ |
| Inscription | ✓ | - | - | - |
| Cours | aperçu | ✓ | ✓ | ✓ |
| Exercices | - | ✓ | ✓ | ✓ |
| Speaking | - | ✓ | ✓ | ✓ |
| Progression personnelle | - | ✓ | - | ✓ |
| Progression étudiants | - | - | ✓ | ✓ |
| Feedback | - | lecture | ✓ | ✓ |
| Gestion contenu | - | - | selon permission | ✓ |
| Gestion utilisateurs | - | - | - | ✓ |
| Gestion paiements | - | - | - | ✓ |
| Analytics | - | personnel | pédagogique | global |

---

# 11. Parcours utilisateur principal

## 11.1 Nouveau visiteur

```
Landing
 ↓
Découverte
 ↓
Test gratuit
 ↓
Inscription
 ↓
Onboarding
 ↓
Test de niveau
 ↓
Résultat
 ↓
Objectif
 ↓
Parcours recommandé
 ↓
Première activité
```

---

# 12. Parcours pédagogique

```
Objectif
 ↓
Niveau initial
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
 ↓
Correction
 ↓
Nouvelle tentative
 ↓
Validation
 ↓
Progression
 ↓
Nouvelle activité
```

---

# 13. Parcours de progression

```
Test initial
     ↓
Profil de compétences
     ↓
Parcours personnalisé
     ↓
Pratique régulière
     ↓
Mini-évaluations
     ↓
Feedback
     ↓
Révision
     ↓
Évaluation finale
     ↓
Rapport de progression
```

Le modèle pédagogique prévoit un test initial, des mini-évaluations et un test final afin de rendre l'évolution observable.

---

# 14. Structure fonctionnelle d'une activité

Chaque activité doit pouvoir être décrite avec :

```
ID
Titre
Type
Niveau
Compétence
Objectif pédagogique
Instructions
Contenu
Durée estimée
Prérequis
Score
Critère de réussite
Feedback
```

---

# 15. Structure fonctionnelle d'une évaluation

```
Evaluation
 ├── Type
 ├── Version
 ├── Niveau
 ├── Compétences
 ├── Questions
 │    ├── Question
 │    ├── Réponse
 │    ├── Score
 │    └── Correction
 └── Result
      ├── Score global
      ├── Score compétence
      └── Niveau estimé
```

---

# 16. Speaking — spécification fonctionnelle approfondie

## 16.1 Démarrage

L'utilisateur choisit :

- scénario ;
- niveau ;
- durée ;
- difficulté.

---

## 16.2 Session

L'application présente une situation.

Exemple :

> "You are attending a job interview for a junior developer position."
> 

L'utilisateur répond oralement.

---

## 16.3 Analyse

Le système peut analyser :

- transcription ;
- prononciation ;
- vocabulaire ;
- grammaire ;
- fluidité ;
- pertinence.

---

## 16.4 Feedback

Le système affiche :

```
What you did well

What you can improve

Suggested correction

Better way to say it

Practice again
```

---

## 16.5 Nouvelle tentative

L'apprenant peut refaire la réponse.

Le système conserve les tentatives lorsque cela est pertinent afin de mesurer la progression.

---

# 17. Personnalisation

Le système doit pouvoir utiliser :

- niveau ;
- objectif ;
- historique ;
- erreurs ;
- compétences faibles ;
- activité récente ;
- préférences.

pour recommander une prochaine activité.

### Exemple

```
Speaking faible
+
Objectif entretien
+
Grammar moyenne

↓

Recommendation

"Practice:
Job Interview — Tell me about yourself"
```

---

# 18. Mode faible connectivité

## Objectif

Permettre une utilisation acceptable lorsque la connexion est limitée.

### Priorités

Les éléments textuels doivent être prioritaires.

Les médias doivent être :

- compressés ;
- chargés à la demande ;
- éventuellement mis en cache.

### Évolution future

Le mode offline complet pourra permettre :

- téléchargement des leçons ;
- exercices offline ;
- stockage local ;
- synchronisation ultérieure.

**Priorité : V2**

---

# 19. WhatsApp

WhatsApp peut être utilisé en complément de la plateforme, notamment durant les premières phases du produit.

Le tunnel commercial de référence prévoit :

```
Publicité
↓
Test
↓
WhatsApp
↓
Analyse
↓
Masterclass / essai
↓
Offre
↓
Paiement
↓
Onboarding
```

Le business model prévoit également l'utilisation de WhatsApp Business comme mini-CRM au lancement.

La plateforme Lingora ne doit cependant pas dépendre structurellement de WhatsApp pour son fonctionnement pédagogique.

---

# 20. États principaux d'un apprenant

```
REGISTERED
    ↓
ONBOARDING
    ↓
PLACEMENT_PENDING
    ↓
PLACEMENT_COMPLETED
    ↓
LEARNING
    ↓
ACTIVE
    ↓
INACTIVE
    ↓
COMPLETED
```

Ces états sont fonctionnels et pourront être affinés lors de la conception de la base de données.

---

# 21. États d'une leçon

```
LOCKED
AVAILABLE
IN_PROGRESS
COMPLETED
```

---

# 22. États d'un contenu

```
DRAFT
IN_REVIEW
PUBLISHED
ARCHIVED
```

---

# 23. États d'un abonnement

```
PENDING
ACTIVE
EXPIRED
CANCELLED
SUSPENDED
```

---

# 24. États d'un paiement

```
PENDING
PAID
FAILED
CANCELLED
REFUNDED
```

---

# 25. Notifications fonctionnelles

Le système doit pouvoir déclencher une notification lorsqu'un événement important survient.

### Exemples

```
Nouvelle leçon disponible
Objectif quotidien non réalisé
Nouveau feedback
Résultat disponible
Progression atteinte
Abonnement bientôt expiré
Paiement confirmé
```

---

# 26. Sécurité fonctionnelle

La plateforme doit prévoir :

- authentification sécurisée ;
- gestion des sessions ;
- contrôle des permissions ;
- protection des données personnelles ;
- séparation des rôles ;
- validation des entrées ;
- journalisation des événements sensibles ;
- protection des données vocales ;
- gestion des accès aux contenus premium.

---

# 27. Données personnelles

Les données pouvant être collectées comprennent notamment :

- identité ;
- email ;
- résultats pédagogiques ;
- historique d'activité ;
- réponses ;
- enregistrements vocaux ;
- données de paiement ;
- préférences.

Les données vocales et pédagogiques doivent être traitées comme des données sensibles du point de vue produit et sécurité, avec une politique de conservation à définir avant la mise en production.

---

# 28. Architecture des écrans

## Espace public

```
01 Landing
02 Programmes
03 Programme détail
04 À propos
05 FAQ
06 Test niveau
07 Connexion
08 Inscription
```

## Espace étudiant

```
09 Dashboard
10 Learning Path
11 Course
12 Lesson
13 Exercise
14 Vocabulary
15 Grammar
16 Listening
17 Speaking Lab
18 AI Conversation
19 Feedback
20 Progress
21 Goals
22 Profile
23 Subscription
24 Payment
```

## Espace enseignant

```
25 Dashboard
26 Students
27 Student Detail
28 Progress
29 Feedback
30 Content
31 Evaluations
```

## Administration

```
32 Dashboard
33 Users
34 Teachers
35 Students
36 Programs
37 Courses
38 Lessons
39 Exercises
40 Speaking Scenarios
41 Offers
42 Subscriptions
43 Payments
44 Analytics
45 Settings
```

---

# 29. Priorisation

## P0 — Indispensable

- Authentification
- Onboarding
- Test de niveau
- Résultat
- Dashboard
- Learning Path
- Cours
- Lessons
- Exercices
- Speaking
- Progression
- Profil
- Dashboard enseignant
- Gestion étudiants
- Gestion contenu de base

## P1 — Important

- AI Conversation
- AI Feedback avancé
- Goals
- Daily Practice
- Notifications
- Gamification
- Abonnements
- Paiements
- Analytics

## P2 — Évolution

- Offline
- Personnalisation avancée
- Corporate
- CRM
- Automatisations
- International
- Diaspora

---

# 30. Critères globaux d'acceptation

Le produit sera considéré comme fonctionnellement valide lorsque :

### Inscription

Un nouveau visiteur peut créer un compte sans assistance.

### Niveau

Un utilisateur peut passer un test et obtenir un résultat exploitable.

### Parcours

Un utilisateur peut commencer un parcours adapté à son niveau.

### Apprentissage

Un utilisateur peut suivre une leçon et réaliser une activité.

### Speaking

Un utilisateur peut effectuer une activité orale et recevoir un feedback.

### Progression

Le système conserve les résultats et permet de visualiser l'évolution.

### Enseignant

Un enseignant peut consulter ses apprenants et leur progression.

### Administration

Un administrateur peut gérer les contenus nécessaires au fonctionnement du produit.

### Mobile

Le parcours principal est utilisable depuis un smartphone.

---

# 31. Hors périmètre initial

Les éléments suivants ne doivent pas retarder le MVP :

- réseau social interne ;
- marketplace de professeurs ;
- visioconférence propriétaire ;
- application mobile native ;
- intelligence artificielle entièrement autonome ;
- CRM commercial complet ;
- fonctionnalités corporate complexes ;
- marketplace de contenus ;
- certification internationale ;
- système de paiement multi-pays avancé.

Le principe du business model est explicitement de valider le produit avant d'investir dans une plateforme propriétaire complète.

---

# 32. Hypothèses à valider

Les points suivants ne doivent pas être considérés comme définitivement décidés :

### H01 — Prix

Les prix des offres sont actuellement des hypothèses commerciales.

### H02 — Paiement

Le ou les prestataires Mobile Money restent à définir.

### H03 — Cadre pédagogique

Le référentiel exact des niveaux doit être finalisé.

### H04 — IA

Les fournisseurs STT, LLM et TTS doivent être sélectionnés.

### H05 — Mode offline

Le niveau d'offline nécessaire doit être validé par l'usage réel.

### H06 — Abonnement

Le choix entre paiement mensuel et paiement d'un cycle complet doit être arrêté.

Le business model identifie explicitement cette dernière décision comme restant à trancher.

---

# 33. Dépendances fonctionnelles

```
AUTH
 ↓
ONBOARDING
 ↓
PLACEMENT
 ↓
PROFILE
 ↓
LEARNING PATH
 ↓
COURSES
 ↓
LESSONS
 ↓
EXERCISES
 ↓
SPEAKING
 ↓
FEEDBACK
 ↓
PROGRESS
```

Les modules suivants dépendent ensuite de cette base :

```
PROGRESS
 ├── Analytics
 ├── Goals
 ├── Recommendations
 └── Teacher Dashboard
```

Et :

```
USER
 ↓
PLAN
 ↓
SUBSCRIPTION
 ↓
PAYMENT
 ↓
PREMIUM ACCESS
```

---

# 34. Ordre recommandé de développement

## Phase 1 — Fondation

- architecture projet ;
- authentification ;
- utilisateurs ;
- rôles ;
- profil.

## Phase 2 — Moteur pédagogique

- programmes ;
- modules ;
- cours ;
- lessons ;
- exercices ;
- progression.

## Phase 3 — Placement

- test ;
- questions ;
- réponses ;
- scoring ;
- résultats.

## Phase 4 — Student Experience

- dashboard ;
- learning path ;
- activités ;
- objectifs.

## Phase 5 — Speaking

- scénarios ;
- enregistrement ;
- transcription ;
- analyse ;
- feedback.

## Phase 6 — Teacher

- dashboard ;
- étudiants ;
- progression ;
- feedback.

## Phase 7 — Administration

- CMS ;
- utilisateurs ;
- programmes ;
- contenus ;
- analytics.

## Phase 8 — Business

- offres ;
- abonnements ;
- paiements ;
- notifications.

## Phase 9 — Optimisation

- IA avancée ;
- personnalisation ;
- offline ;
- analytics avancés.

---

# 35. Préparation technique

Après validation du présent CDC, les documents suivants doivent être produits.

## Document 01 — Architecture technique

Définir :

```
Frontend
Backend
API
Database
AI Services
Storage
Authentication
Infrastructure
CI/CD
```

---

## Document 02 — Modèle de données

Définir les tables PostgreSQL :

```
users
profiles
roles
permissions
programs
courses
modules
lessons
activities
questions
answers
assessments
assessment_results
skills
student_progress
goals
speaking_sessions
speaking_attempts
ai_feedback
subscriptions
plans
payments
notifications
...
```

Le schéma définitif devra être dérivé des fonctionnalités réellement retenues et non construit uniquement à partir d'une liste de tables anticipée.

---

## Document 03 — API Specification

Définir :

```
POST /auth/register
POST /auth/login
GET  /me
GET  /programs
GET  /courses/:id
GET  /lessons/:id
POST /activities/:id/submit
POST /placement/start
POST /placement/answer
GET  /placement/result
POST /speaking/session
POST /speaking/attempt
GET  /progress
...
```

Les endpoints ci-dessus sont illustratifs à ce stade et ne constituent pas encore le contrat API définitif.

---

## Document 04 — Architecture Frontend

Définir :

- routes ;
- layouts ;
- composants ;
- state management ;
- hooks ;
- services ;
- guards ;
- design system ;
- responsive behavior.

---

## Document 05 — Architecture IA

Définir :

```
Audio
 ↓
STT
 ↓
Transcript
 ↓
LLM
 ↓
Pedagogical Analysis
 ↓
Feedback
 ↓
Progression
```

---

# 36. Definition of Done — Fonctionnalité

Une fonctionnalité est considérée comme terminée lorsque :

- son workflow nominal fonctionne ;
- les cas d'erreur sont gérés ;
- les permissions sont respectées ;
- les données sont persistées ;
- l'interface mobile fonctionne ;
- les validations sont implémentées ;
- les critères d'acceptation sont vérifiés ;
- les tests nécessaires sont présents ;
- les logs nécessaires existent ;
- la fonctionnalité ne casse pas les parcours existants.

---

# 37. Definition of Done — MVP

Le MVP Lingora pourra être considéré comme prêt lorsque :

```
✓ Création de compte
✓ Onboarding
✓ Test de niveau
✓ Résultat
✓ Parcours
✓ Cours
✓ Lessons
✓ Exercices
✓ Speaking
✓ Feedback
✓ Progression
✓ Dashboard étudiant
✓ Dashboard enseignant
✓ Gestion étudiants
✓ Gestion contenu
✓ Responsive mobile
✓ Sécurité de base
✓ Tests fonctionnels principaux
```

---

# 38. Vision finale

Lingora ne doit pas être pensé comme :

> « un site qui vend des cours d'anglais ».
> 

Le produit doit devenir progressivement :

> **un environnement d'apprentissage qui aide un apprenant à pratiquer, parler, recevoir du feedback et démontrer sa progression.**
> 

Le développement doit donc toujours privilégier la boucle :

```
APPRENDRE
   ↓
PRATIQUER
   ↓
PARLER
   ↓
RECEVOIR UN FEEDBACK
   ↓
CORRIGER
   ↓
RECOMMENCER
   ↓
MESURER
   ↓
PROGRESSER
```

Cette boucle constitue le cœur fonctionnel de Lingora.

---

# 39. Documents suivants

Après validation du CDC, l'ordre recommandé est :

### 01 — Architecture technique complète

**Next.js + TypeScript + PWA + Backend Python/FastAPI + PostgreSQL + services IA**

↓

### 02 — Modèle de données PostgreSQL

Tables, relations, contraintes, index, enums, historique et audit.

↓

### 03 — Architecture Backend

Modules, services, repositories, API, authentification, permissions et intégration IA.

↓

### 04 — Architecture Frontend Next.js

Routes, layouts, composants, hooks, services, state management et design system.

↓

### 05 — Spécification API

Contrats request/response, erreurs, authentification et permissions.

↓

### 06 — Architecture IA

STT, LLM, TTS, analyse pédagogique, feedback, recommandations et garde-fous.

↓

### 07 — Spécification UX/UI

Chaque écran avec :

- objectif ;
- structure ;
- composants ;
- états ;
- actions ;
- responsive ;
- erreurs ;
- navigation.

↓

### 08 — Plan Git & développement

Branches, commits, issues, milestones, PR/MR, releases et workflow solo.

---

# FIN DU CDC v1.0

**Document suivant recommandé : LINGORA — Architecture Technique & Architecture Système v1.0**