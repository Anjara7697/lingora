# Lingora — brief de refonte design de l'application

Document à fournir à Claude Design avec les captures du dossier `screens/` (390 px de large, mobile d'abord).
Le code des écrans est dans `frontend/` du dépôt `Anjara7697/lingora`.

## 1. Le produit en bref

**Lingora** : plateforme d'apprentissage de l'anglais pour Madagascar, centrée sur **l'oral** (« Learn. Speak. Grow. »).
Un élève passe un test de niveau, suit un programme de leçons et d'exercices corrigés automatiquement, s'entraîne à parler
dans le **Speaking Lab** (enregistrement, transcription, feedback par critères) et peut passer en **Premium**.
Un enseignant suit ses élèves et leur laisse des retours ; un administrateur gère utilisateurs, contenus et paiements.

Détails produit : `docs/01-PRD.md` (utilisateurs, parcours, principes). Les documents 03 et 04 sont techniques et inutiles pour le design.

## 2. Public et contexte d'usage

- Élèves surtout **sur smartphone Android**, écran étroit, parfois en **réseau lent ou coupé** (l'app est une PWA installable
  avec leçons téléchargeables hors ligne).
- Interface **en français** ; contenus d'apprentissage en anglais. Ton : encourageant, simple, sans jargon.
- Débutants à l'aise ou non avec le numérique : cibles tactiles larges (≥ 44 px), un objectif par écran, textes courts.
- Enseignants et admin : usage mobile et ordinateur, écrans plus denses (listes, filtres, chiffres).

## 3. Ce qui existe aujourd'hui (provisoire)

L'habillage actuel est **un point de départ technique, pas la marque** : indigo `#4f46e5`, police système/Geist, cartes blanches
à bordure grise, boutons pleins indigo, emoji comme pictogrammes (🎙️, 🔔, 👋). Le logo de la PWA (bulle de dialogue avec un « L »)
a été dessiné à la hâte pour l'icône d'installation. **Tout cela doit être remplacé par la charte du projet « Lingora »**
(logo, couleurs, typographies, ton, éléments de marque).

## 4. Inventaire des écrans

Chaque capture correspond à une route et à un fichier source (`frontend/app/...`).

### Visiteur et authentification
| Capture | Route | Source |
|---|---|---|
| 01-accueil | `/` | `page.tsx` |
| 02-connexion | `/login` | `(auth)/login` |
| 03-mot-de-passe-oublie | `/forgot-password` | `(auth)/forgot-password` |
| 04-inscription | `/register` | `(auth)/register` |

### Élève
| Capture | Route | Notes |
|---|---|---|
| 05-onboarding | `/onboarding` | objectif principal + minutes par jour |
| 06-test-de-niveau | `/placement` | 25 questions, une à la fois, reprise possible |
| 07-resultat-test-de-niveau | `/placement/result` | niveau CEFR global + par compétence |
| 08-programmes | `/programs` | liste |
| 09-programme-detail | `/programs/[slug]` | cours, leçons, statuts (verrouillée, en cours, terminée), téléchargement hors ligne |
| 10-lecon | `/lessons/[id]` | contenus + exercices de 10 types (QCM, vrai/faux, texte à trous, ordre, association, écriture, pratique orale…) |
| 11-lecon-exercice-corrige | idem | état « bonne/mauvaise réponse » avec explication |
| 12-tableau-de-bord | `/dashboard` | niveau, « continuer », programmes, accès Speaking Lab |
| 13-speaking-liste | `/speaking` | scénarios par difficulté |
| 14-speaking-scenario | `/speaking/[slug]` | situation + bouton micro |
| 15-speaking-enregistrement | idem | enregistrement en cours (minuteur) |
| 16-speaking-avant-envoi | idem | relecture de la transcription avant analyse |
| 17-speaking-feedback | idem | score global, critères (grammaire, vocabulaire, fluidité, pertinence, prononciation), points forts, axe prioritaire |
| 18-premium-gratuit | `/billing` | essai gratuit 7 jours, offre mensuelle, quota du jour |
| 19-paiement-demo | `/billing/demo-checkout` | page de simulation (sera remplacée par le fournisseur réel) |
| 20-premium-actif | `/billing` | abonnement actif, historique |
| 21-notifications-vide, 28-notifications | `/notifications` | retours de l'enseignant |
| 22-hors-ligne-telechargements | `/downloads` | leçons stockées, réponses en attente |
| 23-hors-ligne-page | `/offline` | page affichée sans réseau |
| 24-bureau-tableau-de-bord | `/dashboard` en 1280 px | comportement sur grand écran |

### Enseignant
| Capture | Route |
|---|---|
| 25-enseignant-eleves | `/teacher` (liste, statuts : nouveau, en bonne voie, peu actif, difficulté à l'oral, inactif) |
| 26-enseignant-fiche-eleve | `/teacher/students/[id]` (progression, compétences, retours) |
| 27-enseignant-session-speaking | `/teacher/students/[id]/speaking/[sessionId]` (écoute, analyse, retour) |

### Administrateur
| Capture | Route |
|---|---|
| 29-admin-statistiques | `/admin` (indicateur principal, entonnoir d'activation, séries) |
| 30-admin-utilisateurs | `/admin/users` |
| 31-admin-enseignants | `/admin/teachers` |
| 32-admin-paiements | `/admin/payments` (revenus, abonnés, historique) |
| 33-admin-contenu | `/admin/content` (programmes, leçons, scénarios, éditeur d'exercices) |

## 5. Éléments communs à concevoir

- **Navigation** : en-tête actuel = logo + liens + cloche (notifications) + déconnexion, qui s'empile mal sur mobile.
  Proposer une navigation mobile adaptée (barre d'onglets en bas pour l'élève ?) et une navigation enseignant / admin.
- **Composants** : bouton (primaire, secondaire, discret, danger), champ de formulaire, carte, barre de progression,
  pastille de statut, pastille de niveau (A1–C2), liste, onglets/filtres, fenêtre de confirmation, messages (succès, erreur, info).
- **Exercices** : un composant par type, états : vide, sélectionné, validé juste, validé faux, verrouillé, réponse en attente d'envoi (hors ligne).
- **Speaking Lab** : bouton micro (prêt, enregistrement, traitement), minuteur, carte de feedback, jauges de critères.
- **États transversaux** à dessiner : chargement (squelettes), liste vide, erreur réseau, **hors ligne** (bandeau + lecture seule),
  « réponse enregistrée sur l'appareil », succès de synchronisation, quota gratuit atteint (invitation à passer Premium).
- **Pictogrammes** : jeu d'icônes cohérent (SVG) à la place des emoji.
- **Illustrations / moments de joie** : fin de leçon, résultat du test de niveau, premier feedback.
- **PWA** : icône d'installation (192, 512, maskable), couleur de thème, écran de lancement.

## 6. Contraintes techniques (pour que les maquettes soient réalisables)

- Front : Next.js (App Router) + **Tailwind CSS v4**. Les couleurs, polices, rayons et espacements doivent pouvoir se
  déclarer comme **variables de thème** (`app/globals.css`, bloc `@theme`) ; éviter les valeurs « magiques » éparses.
- Polices : chargées via `next/font` (Google Fonts ou fichiers locaux) ; limiter à 2 familles et 3–4 graisses (poids de page).
- Performance : pas de grosses images ni de bibliothèque d'animation lourde ; images en SVG ou formats légers.
- Accessibilité : contraste AA minimum, focus visible, zones tactiles ≥ 44 px, ne pas porter l'information par la couleur seule.
- Mode sombre : optionnel (non géré aujourd'hui) ; à préciser si souhaité.
- **Le comportement des écrans ne change pas** : on redessine l'apparence et l'organisation visuelle, pas les règles métier
  ni l'API. Si une maquette impose un changement fonctionnel, le signaler explicitement.

## 7. Livrables attendus de Claude Design

1. Une **charte appliquée à l'app** : couleurs (avec rôles : primaire, accent, succès, erreur, avertissement, neutres),
   typographies, rayons, ombres, espacements, icônes.
2. Les **maquettes mobiles (390 px)** de tous les écrans ci-dessus, avec les états listés en §5, puis les variantes grand écran
   pour enseignant et admin.
3. Un **mini-système de composants** (boutons, champs, cartes, jauges, pastilles, exercices) pour implémentation directe.

Côté code, l'intégration se fera par étapes : (1) variables de thème et composants de base, (2) écrans élève, (3) enseignant et admin.

## 8. Prompt suggéré

> Voici l'application Lingora (dépôt GitHub `Anjara7697/lingora`, dossier `frontend/`) et son brief `docs/design/BRIEF.md`.
> Les captures de `docs/design/screens/` montrent l'apparence actuelle, provisoire. À partir de la charte de marque du projet
> « Lingora », conçois la refonte de l'application, mobile d'abord, en commençant par : navigation, tableau de bord, leçon
> avec exercices, Speaking Lab (enregistrement et feedback). Donne-moi d'abord le système (couleurs, typographies, composants),
> puis les écrans. Respecte les contraintes techniques du brief.

## 9. Régénérer les captures

Les captures ont été prises sur l'application lancée avec des données de démonstration (compte élève fictif, programme « English Speaking »,
scénario Speaking, essai puis abonnement simulé, enseignante et administrateur de démonstration). Pour les refaire après un changement
visuel : `docker compose up --build`, parcourir les écrans en 390 px de large (outils de développement du navigateur).
