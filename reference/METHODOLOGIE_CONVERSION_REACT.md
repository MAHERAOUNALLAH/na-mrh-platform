# NA-MRH — Méthodologie de conversion HTML → React

Ce document définit **l'ordre exact** dans lequel convertir la maquette (4204 lignes, 151 fonctions, ~20 écrans, 3 langues) en une vraie application React + Express + PostgreSQL, en tenant compte du temps qu'il vous reste.

**Principe directeur : on ne réécrit pas le design, on migre la structure.** Le contenu (textes FR/EN/AR), les couleurs, les polices, la logique métier (qui peut faire quoi) — tout ça a déjà été validé avec le client. Ce qui change, c'est *comment* le code produit cet affichage : une fonction `render()` géante devient des composants séparés.

---

## Rappel de réalité (important)

La maquette a **~20 écrans** et **151 fonctions**. Convertir *tout*, avec authentification réelle, en 7 jours solo, n'est pas possible — ça ne l'était déjà pas pour construire juste le MVP en base de données, et on a bien fait d'accepter cette limite dès le départ.

Cette méthodologie est donc **taillée pour convertir le MVP proprement**, avec une structure qui permet d'ajouter le reste plus tard sans tout reconstruire. Chaque phase se termine par un **critère de validation** — vous ne passez à la phase suivante que si le critère est rempli.

---

## Phase 0 — Fondations partagées (à construire une seule fois)

Tout ce qui suit sera réutilisé par **chaque** page. On ne le refait jamais.

### 0.1 — Extraire le design (CSS)
La maquette a déjà un design system complet dans sa balise `<style>` (variables de couleur, classes `.btn`, `.status-chip`, `.workspace-section`...). **On ne le réécrit pas.**

→ Copiez tout le contenu de `<style>...</style>` de la maquette dans `client/src/index.css`, tel quel. C'est un gain de temps énorme : le design est déjà validé par le client.

### 0.2 — Extraire les traductions (i18n)
La maquette a trois objets géants `fr:{...}`, `en:{...}`, `ar:{...}`. On les sort du JS et on les transforme en fichiers de traduction.

```powershell
npm install react-i18next i18next
```

Structure :
```
client/src/locales/
  fr.json
  en.json
  ar.json
```

C'est un travail mécanique (copier-coller les objets, les convertir en JSON), pas un travail de réflexion — mais c'est long vu la taille. Faites-le une fois, bien, et n'y touchez plus.

### 0.3 — Mettre en place le routeur
La maquette utilise `state.route` pour savoir quelle page afficher. React a un outil dédié pour ça :

```powershell
npm install react-router-dom
```

Chaque valeur de `state.route` devient une route :

| Ancien `state.route` | Nouvelle route React |
|---|---|
| `'home'` | `/` |
| `'members'` | `/etats-membres` |
| `'member'` (+ param) | `/etats-membres/:id` |
| `'twgs'` | `/groupes-de-travail` |
| `'library'` | `/bibliotheque` |
| `'news'` | `/actualites` |
| `'contact'` | `/contact` |
| `'admin'` | `/secretariat/*` (protégé) |

### 0.4 — La coquille commune (Layout)
Header (logo, nav, drapeaux, sélecteur de langue) + Footer : **un seul composant** `<Layout>`, utilisé par toutes les pages publiques. On ne le duplique jamais.

### 0.5 — Contexte de langue
Un `LanguageContext` React (basé sur `useContext`) qui retient la langue choisie et le sens (`ltr`/`rtl`) — équivalent de `state.lang` dans la maquette, mais partagé proprement entre composants au lieu d'une variable globale.

**✅ Critère de validation de la Phase 0** : le site affiche un header vide avec le sélecteur FR/EN/AR fonctionnel (le contenu change de langue, la direction RTL s'inverse en arabe), et la navigation change l'URL sans recharger la page.

---

## Phase 1 — Pages publiques (lecture seule = GET uniquement)

C'est la suite logique de ce qu'on a commencé avec les pays. **Chaque page suit exactement le même pattern** que `App.jsx` (useState + useEffect + fetch + .map()) — seul le contenu change.

Ordre de conversion (du plus simple au plus complexe) :

1. **Accueil** — surtout statique + les stats (déjà fait en partie avec les pays)
2. **États membres** (liste + fiche détail) — réutilise `/api/countries`
3. **Groupes de travail** (liste + fiche détail) — nouvelle route `/api/twgs`
4. **Bibliothèque documentaire** (publique uniquement — filtrer `visibility = 'public'`) — nouvelle route `/api/documents?visibility=public`
5. **Gouvernance** — essentiellement du texte statique, pas besoin d'API
6. **Actualités** — nouvelle route `/api/news`
7. **Contact** — formulaire = **premier POST** du frontend (envoie un message, pas de table dédiée nécessaire pour le MVP, ou réutilise `complaints`)
8. **Réclamations** — formulaire POST vers `/api/complaints`, table déjà prête

**✅ Critère de validation de la Phase 1** : les 8 pages publiques s'affichent, dans les 3 langues, avec les vraies données de la base (plus aucune donnée codée en dur dans le JSX).

---

## Phase 2 — Authentification et coquille admin

C'est ici que ça devient un « vrai » produit et non plus une démo.

### 2.1 — Connexion réelle
Contrairement à la maquette (persona factice cliquable), on construit une vraie connexion :
- Formulaire email + mot de passe → **POST** `/api/auth/login`
- Le serveur compare le mot de passe avec `bcrypt.compare()` contre `passwordHash`
- Si valide, renvoie un **token** (JWT) que React stocke et renvoie à chaque requête suivante

### 2.2 — Routes protégées
Un composant `<RouteProtegee>` qui vérifie que l'utilisateur est connecté avant d'afficher l'espace Secrétariat — sinon, redirige vers la connexion.

### 2.3 — Vérification des droits (matrice des habilitations)
C'est le moment d'utiliser concrètement le document `MATRICE_HABILITATIONS.md` produit plus tôt : chaque route sensible du serveur vérifie `req.user.level` avant d'agir. **Le serveur décide, jamais le frontend seul** (le frontend peut cacher un bouton, mais le serveur doit refuser l'action même si quelqu'un contourne l'interface).

**✅ Critère de validation de la Phase 2** : impossible d'accéder à `/secretariat` sans être connecté ; un utilisateur `reader` ne peut pas déclencher une action réservée à `country_admin`, même en forçant l'appel API à la main (testez avec Postman/Thunder Client).

---

## Phase 3 — Espace Secrétariat (MVP admin)

Dans l'ordre de priorité métier (ce que le client veut voir en premier) :

1. **Tableau de bord** — quelques compteurs (nombre de pays, documents en attente...)
2. **Comptes des pays** — CRUD complet (créer/modifier/supprimer), reprend le formulaire déjà construit dans la maquette
3. **Gestion des utilisateurs** — ajout d'utilisateurs internes par pays, fonctions réglementaires, rôle GTT
4. **Circuit documentaire** — liste + changement de statut (version simplifiée : sans versionning ni commentaires pour le MVP, ils viendront en Phase 4)
5. **Gestion du contenu** — éditer actualités, coordonnées de pays, descriptions de GTT

**✅ Critère de validation de la Phase 3** : le Secrétariat peut se connecter et faire, de bout en bout, les actions ci-dessus, avec les changements visibles immédiatement sur le site public (ex. modifier le téléphone d'un pays et le voir sur la page Contact).

---

## Phase 4 — Au-delà du MVP (si le temps le permet)

Dans cet ordre, seulement une fois les Phases 0 à 3 solides :

1. Versionning des documents + commentaires + historique
2. Missions et suivi
3. Réunions, discussions de GTT, dossiers REC-RIMS
4. Planification budgétaire
5. Veille réglementaire
6. Répertoire des experts, Comité de Pilotage, Journal d'activité
7. Espace national / GTT par persona (le plus complexe — nécessite le contrôle d'accès le plus fin)
8. Chatbots (dans la maquette ils étaient simulés — une vraie IA générative serait un projet à part entière)

Ne commencez **aucun** point de cette liste avant que les Phases 0-3 soient stables. C'est la partie qu'on peut couper si le temps manque, sans que le client soit privé de l'essentiel.

---

## Ce qui ne change PAS entre la maquette et React

Pour que vous sachiz précisément où chercher quand vous convertissez une page :

| Dans la maquette | Devient dans React |
|---|---|
| `t().nav.home` (traduction) | `t('nav.home')` (react-i18next) |
| `state.lang` | `useContext(LanguageContext)` |
| `render()` qui réécrit le HTML | Chaque composant se redessine seul (React s'en charge) |
| `COUNTRIES` (tableau en dur) | `fetch('/api/countries')` dans un `useEffect` |
| `onclick="navigate('twg', id)"` | `<Link to={`/gtt/${id}`}>` |
| Le CSS de la balise `<style>` | `index.css`, copié tel quel |
| Les fonctions `admin*()` (ex. `adminAccounts()`) | Un composant par fonction, ex. `<AdminAccounts />` |

---

## Prochaine étape concrète

D'après cette méthodologie, la suite immédiate est la **Phase 0** : extraire le CSS, mettre en place `react-router-dom`, et construire le `<Layout>` (header + footer + sélecteur de langue). C'est un travail de plomberie, pas de réflexion complexe — une fois fait, toutes les pages suivantes s'enchaînent vite.

Dites-moi si vous validez cet ordre, et on démarre la Phase 0 concrètement, fichier par fichier.