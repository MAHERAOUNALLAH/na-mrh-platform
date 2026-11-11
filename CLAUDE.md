# NA-MRH Digital Platform — Contexte projet pour Claude Code

## Résumé
Plateforme de collaboration régionale (harmonisation réglementaire pharmaceutique, Afrique du Nord). Conversion d'une maquette HTML statique vers une vraie application React + Express + PostgreSQL.

## Stack technique
- **Frontend** : `client/` — React (Vite), react-router-dom, react-i18next. Déploiement visé : Vercel.
- **Backend** : `server/` — Node.js (`^20.19 || ^22.12 || >=24`, exigence de Prisma 7), Express 5, Prisma 7 (avec driver adapter `@prisma/adapter-pg`), helmet, express-rate-limit
- **Base de données** : PostgreSQL (Docker local, port 5433)

## Fichiers de référence — à consulter avant de coder quoi que ce soit

| Fichier | Rôle |
|---|---|
| `reference/NA-MRH_Platform_Maquette_FR-EN-AR ).html` (« la maquette ») | **Source de vérité pour le design et le contenu.** Contient tout le CSS (classes exactes à réutiliser), les textes FR/EN/AR, et la logique métier de chaque page. Ne jamais réinventer un style : chercher la classe CSS correspondante dans son `<style>`. |
| `server/prisma/schema.prisma` | **Source de vérité pour la structure des données.** Les noms de champs diffèrent parfois de la maquette (ex. `twg.nameFr` en base, alors que la maquette écrivait `w.name.fr`). Toujours vérifier le schéma avant d'écrire une requête. |
| `server/prisma/seed-reference.js` | Données de **référence** (12 fonctions réglementaires, 6 pays, 5 GTT), sûres en production. |
| `server/prisma/seed-demo.js` | Données de **démonstration** (10 comptes fictifs `@example.org`, documents, actualités, réclamation) — local uniquement. S'en servir pour vérifier qu'une route renvoie bien quelque chose. |
| `DEPLOY.md` | **Procédure de mise en ligne**, dans l'ordre, et checklist après déploiement. |
| `reference/METHODOLOGIE_CONVERSION_REACT.md` | **Le plan de conversion, phase par phase.** Ne pas construire une fonctionnalité de Phase 3 avant que les Phases 0-2 soient terminées. |
| `reference/MATRICE_HABILITATIONS.md` | Qui a le droit de faire quoi. À respecter dès qu'une route touche à des données sensibles ou à une action de modification. |

## Conventions déjà établies (à reproduire, pas à réinventer)

### Appels à l'API (client)
- **Toujours** passer par les helpers de `client/src/utils/api.js` : `apiGet(path, token)`, `apiPost(path, token, body)`, `apiPut`, `apiPatch`, `apiDelete`. Pour une route publique, `token` vaut `null` (ou est omis pour `apiGet`).
- **Jamais** de `fetch('http://...')` en dur dans une page : l'adresse de l'API n'existe qu'à un endroit, `BASE_URL` dans `api.js`, lue dans `VITE_API_URL` (défaut local `http://localhost:4000`). `grep -rn "localhost" client/src` ne doit renvoyer que ce repli.
- En cas d'échec, la promesse est rejetée avec une `Error` dont `err.message` est le message du serveur et `err.status` le code HTTP (`undefined` pour une panne réseau). Un 404 attendu se traite comme un message, pas comme une panne (voir `TwgDetail.jsx` : `if (err.status === 404)`).
- **401/403 en cours de session** : `api.js` prévient `AuthContext` (point d'entrée unique `setAuthErrorHandler`) quand un appel **avec jeton** reçoit 401 ou 403. 401 → déconnexion, retour sur `/connexion` avec un message ; 403 → relecture du profil, `ProtectedRoute` affiche « Accès refusé ». Les pages n'ont rien à gérer elles-mêmes. Au chargement, seul un refus (401/403) efface le jeton : une panne réseau ou un 5xx le conserve et `ProtectedRoute` propose « Réessayer ».

### Pages
- Une page = un fichier dans `client/src/pages/NomPage.jsx`
- Pattern standard pour une page qui lit des données :
```jsx
const [data, setData] = useState([]);
const [loading, setLoading] = useState(true);
const [error, setError] = useState(null);

useEffect(() => {
  apiGet('/api/...')
    .then((d) => { setData(d); setLoading(false); })
    .catch(() => { setError(t('common.error')); setLoading(false); });
}, []);
```
- Chaque nouvelle page doit être ajoutée aux routes dans `client/src/App.jsx`
- Le `useEffect` des pages de **liste** garde `[]` en dépendances : la réponse de l'API contient déjà les trois langues, changer de langue ne doit pas relancer l'appel.
- Pour une page de **détail** (`/xxx/:id`), ne pas remettre l'état à zéro à la main en début d'effet (`setLoading(true)`) : ESLint le refuse (`react-hooks/set-state-in-effect`). Utiliser le motif de `TwgDetail.jsx` — un petit composant qui lit `useParams()` et rend la vue avec `key={id}`, ce qui la remonte et réinitialise l'état tout seul.
- Un identifiant inconnu doit produire un **404 côté API** et un message côté page (`twgsPage.notFound`), pas une page vide ni une erreur rouge.
- ⚠️ **Une URL sans route correspondante ne rend pas une page à moitié vide : elle rend `null`**, donc un écran entièrement blanc, sans en-tête ni pied de page (le `Layout` parent ne matche pas non plus). Tout lien présent dans le menu doit donc avoir une route — au minimum vers `ComingSoon`.
- **Tri et filtrage ne sont pas la même chose** : trier selon la langue affichée (`localeCompare`) se fait côté React, c'est du confort de lecture. Filtrer ce que l'utilisateur a le droit de voir reste côté serveur (voir la section Sécurité).

### Contenu multilingue venant de la base
Les enregistrements ont des champs `xxxFr`, `xxxEn`, `xxxAr` séparés (pas d'objet imbriqué). Utiliser le helper partagé `client/src/utils/lang.js` :
```javascript
// client/src/utils/lang.js
export function pickLang(obj, field, lang) {
  const cap = lang.charAt(0).toUpperCase() + lang.slice(1);
  return obj[`${field}${cap}`];
}
```
Toute page qui affiche du contenu multilingue venant de l'API l'importe depuis là (`import { pickLang } from '../utils/lang'`). Ne jamais redéfinir cette fonction localement dans une page — c'est le genre de duplication qui part vite en incohérence.

La langue se lit via `const { i18n } = useTranslation()` puis `i18n.language` : `i18n.js` n'utilise pas de détecteur, la valeur est donc toujours exactement `fr`, `en` ou `ar` (jamais `fr-FR`).

### Composants partagés déjà en place
- `client/src/utils/api.js` — helpers d'appel à l'API (voir ci-dessus)
- `client/src/utils/lang.js` — `pickLang` (voir ci-dessus)
- `server/utils/email.js` — `normalizeEmail` / `isValidEmail` (voir Backend, règle des e-mails)
- `client/src/components/Flag.jsx` — `<Flag code="tn" title="Tunisie" />`, portage du `flagIcon()` de la maquette. Cinq drapeaux sont dessinés en SVG ; celui de l'Égypte est l'image officielle, extraite du base64 de la maquette vers `client/public/flags/eg.png`.

### CSS
- **Toujours** utiliser les classes réelles de la maquette (`className="twg-card"`, pas de `style={{...}}` improvisé)
- ⚠️ **Piège connu** : la maquette utilise des `<button>` pour beaucoup d'éléments cliquables (cartes, liens de nav). React Router (`<Link>`, `<NavLink>`) génère des `<a>`. Si le CSS de la maquette cible `.xxx button`, et qu'on utilise un `<Link>`, il faut ajouter la même règle pour `.xxx a` (voir `client/src/index.css`, section "CORRECTIF" en bas de fichier, pour des exemples déjà traités).

### Responsive
- **Points d'arrêt** (toujours en `max-width`, documentés en tête de `index.css`) : **480 / 768 / 1024 px**. Au-dessus de 1024 px, rendu de la maquette, sans requête média : une nouvelle règle mobile ne doit rien changer au-delà.
- **Seuil du menu replié : 1180 px** (bouton « Menu » jusqu'à 1180, liens visibles au-delà), propre au menu et hors des points d'arrêt généraux. Au-dessus, les 9 liens tiennent sur une ligne à côté du logo dans la langue la plus longue (FR : dès 1170 px, mesuré). ⚠️ **Si un lien est ajouté au menu, ou un libellé allongé, remesurer et revoir ce seuil** (`@media(max-width:1180px)` dans `index.css`), sinon l'en-tête collant repasse sur deux lignes.
- **Tableaux larges : `.table-scroll`.** Tout `.admin-table` (ou futur tableau large) est enveloppé dans `<div className="table-scroll" role="region" aria-label="…" tabIndex={0}>` : il défile dans son propre cadre (au clavier aussi), avec une ombre sur le bord où du contenu est caché. Une colonne de grille qui contient un tableau doit pouvoir rétrécir (`min-width:0`, déjà posé sur `.admin-layout > *`).
- **Jamais `overflow-x:hidden` sur `html` ou `body`** pour masquer un débordement : il cache le défaut au lieu de le corriger. Un contenu large défile dans SON conteneur. Vérifier : `document.documentElement.scrollWidth` doit égaler la largeur de l'écran.
- **Propriétés logiques** (RTL) : `margin-inline`, `padding-inline`, `inset-inline`, `border-inline-start`, `text-align:start`. Pas de `left`/`right` sauf justification écrite (seule exception : la paire d'ombres symétrique de `.table-scroll`). Le raccourci `padding:Xpx 0` sur un élément qui porte aussi `.container` écrase sa gouttière : utiliser `padding-block`.
- **Mobile (≤ 768 px)** : champs à 16 px (en dessous, Safari iOS zoome la page) et cibles tactiles de 44 px (boutons, liens isolés, `<label>` des cases à cocher). Ne jamais fixer la taille d'un champ par un style en ligne : passer par `.field input` / `.field select` / `textarea` / `.status-select`, définis AVANT les règles mobiles.
- **Tableaux** : un `<td>` ne prend jamais `display:flex` (il cesse d'être une cellule, les bordures se décalent) : mettre le flex dans un `<div>` interne (`.row-actions`, `.cell-country`).
- **Arabe** : numéros, e-mails et adresses web dans `<bdi dir="ltr">` ; champs e-mail / téléphone / site en `direction:ltr` (règle `[dir="rtl"] input[...]`).

### Sécurité — le filtrage est toujours côté serveur
Tout filtre qui décide **ce que l'utilisateur a le droit de voir** appartient au `where` de la requête Prisma, jamais à un `.filter()` React sur les données reçues. Sinon les données sensibles partent quand même dans le navigateur, où elles se lisent dans l'onglet Réseau : le masquage à l'affichage n'est qu'un rideau.

Cas déjà en place — la bibliothèque publique (`/api/documents`) :
```javascript
const PUBLIC_DOCUMENT_FILTER = { status: 'published_public', visibility: 'public' };
where: PUBLIC_DOCUMENT_FILTER   // l'invariant du schéma, appliqué en base
```
Corollaire : utiliser `select` pour ne renvoyer que les champs nécessaires (`filePath`, un chemin de stockage interne, n'a rien à faire dans une réponse publique). Un filtre côté React reste légitime **uniquement** pour du confort de lecture sur des données déjà autorisées (ex. l'onglet de catégorie de la bibliothèque) — le commenter comme tel.

Cette règle s'appliquera à chaque route de la Phase 2-3 : croiser niveau d'accès, GTT d'appartenance et statut/visibilité (voir `reference/MATRICE_HABILITATIONS.md`).

### Backend
- Chaque route suit ce pattern dans `server/index.js` :
```javascript
app.get('/api/xxx', async (req, res) => {
  try {
    const data = await prisma.xxx.findMany({ /* include, orderBy si besoin */ });
    res.json(data);
  } catch (error) {
    console.error('Erreur /api/xxx :', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});
```
- **`requireAuth` relit l'utilisateur en base à chaque requête** : `req.user` = `{ userId, level }` **actuels** (jamais le `level` du jeton). Compte désactivé ou supprimé → 401 immédiat. Ne pas réintroduire un `req.user = payload`.
- **Identifiant numérique dans l'URL** : toujours `const id = parseId(req.params.id); if (id === null) return res.status(400).json({ error: INVALID_ID_ERROR });` — jamais `Number(req.params.id)`.
- **Validation des entrées** : une fonction `validateXxxBody(body)` qui renvoie `{ error }` ou `{ data }`, commune à POST et PUT (modèles : `validateNewsBody`, `validateUserBody`). Types vérifiés, textes nettoyés (`trim`), longueurs bornées, valeurs d'enum lues depuis `@prisma/client` (`UserLevel`, `OrgRole`) plutôt que recopiées, clés étrangères vérifiées. 400 avec un message clair, 404 si l'enregistrement n'existe pas, 409 pour un conflit (e-mail déjà pris…).
- **E-mails des comptes : TOUJOURS en minuscules.** Tout e-mail de compte passe par `normalizeEmail()` de `server/utils/email.js` (trim + minuscules) **à l'écriture** (création, modification, `create-admin`) **et à la lecture** (connexion, avant le `findUnique`, qui est sensible à la casse). Ne jamais enregistrer ni rechercher un e-mail tel que tapé. Le contrôle de doublon reste insensible à la casse (`mode: 'insensitive'`), pour attraper une ancienne adresse restée en majuscules. Base remplie avant cette règle : requêtes de normalisation dans l'annexe de `DEPLOY.md` (lister d'abord les adresses qui ne diffèrent que par la casse).
- **Limitation de débit** : `loginLimiter` sur `POST /api/auth/login` (10 **échecs** / 15 min / IP), `contactLimiter` et `complaintsLimiter` (5 envois / heure / IP, compteurs séparés). Toute nouvelle route publique **d'écriture** doit recevoir son propre limiteur (`makePublicFormLimiter()`).

### Variables d'environnement
Toutes documentées dans `server/.env.example` et `client/.env.example` ; procédure complète dans `DEPLOY.md`.
- **Serveur** : `DATABASE_URL`, `JWT_SECRET` (≥ 32 caractères en production), `NODE_ENV`, `CORS_ORIGIN` (liste blanche, virgules ; défaut local `http://localhost:5173` seulement ; obligatoire en production), `PORT` (défaut 4000), `TRUST_PROXY` (défaut 1 ; une mauvaise valeur casse la limitation de débit sans erreur), `RATE_LIMIT_LOGIN_MAX`, `RATE_LIMIT_FORMS_MAX`, `RATE_LIMIT_DISABLED=1` (dev/tests uniquement, ignorée en production).
- Le serveur **refuse de démarrer** avec un message clair si la configuration est invalide, et affiche au démarrage une ligne `Configuration : …` **sans aucun secret** (ni `JWT_SECRET`, ni `DATABASE_URL`). Ne jamais journaliser ces deux variables.
- **Client** : `VITE_API_URL` — figée **au build** et visible de tous : jamais de secret dans une variable `VITE_*`.
- **`DATABASE_URL` contient le mot de passe de la base : ne jamais l'écrire dans une commande** destinée à la production (historique du shell) ; saisie masquée ou console de l'hébergeur (`DEPLOY.md`, étape 4). Une variable définie dans la session l'emporte sur `server/.env` (dotenv n'écrase pas) — mais si elle n'est pas exportée, scripts et Prisma retombent **en silence** sur `server/.env` : toujours lire la base affichée (`Datasource …` / `base : …`).
- `CORS_ORIGIN` compare chaque adresse **à l'identique**, sans joker : les adresses de prévisualisation Vercel ne sont pas autorisées.
- Tests locaux : l'API peut tourner sur un autre port et une autre base de test sans toucher au serveur de dev (`PORT=4703 DATABASE_URL=… node index.js`, base locale de test uniquement) ; pour un build servi par `vite preview` (port 4173), passer `CORS_ORIGIN=http://localhost:4173` explicitement.

### Données : seeds et premier administrateur
- `npm run seed` (dev local) = `seed:reference` puis `seed:demo`.
- **Le seed de référence ne modifie JAMAIS un enregistrement existant** (création seulement si absent, `upsert` avec `update: {}`) : pays et GTT sont ensuite corrigés par le Secrétariat, une relance ne doit pas écraser ces corrections. Toute donnée ajoutée à `seed-reference.js` suit la même règle.
- `seed:demo` refuse de tourner si `DATABASE_URL` n'est pas locale ou si `NODE_ENV=production` (sauf `ALLOW_DEMO_SEED=1`, base de recette jetable). Ses personnes sont **fictives** (`@example.org`) : n'y mettre aucune vraie personne, le dépôt est public. Admin de démo : `r.jaziri@example.org` / `password123`. Les documents, actualités et la réclamation de démo sont recréés à chaque exécution (pas d'upsert).
- `npm run seed:demo-content -- --admin <e-mail d'un secretariat_admin existant>` (`prisma/seed-demo-content.js`) : 2 actualités et 3 documents publics fictifs, titres marqués « [Contenu de démonstration] » en FR/EN/AR, **aucun compte**. Utilisable en production (non soumis aux garde-fous de `seed:demo`), mais affiche la base visée et exige de taper `oui`. Idempotent par titre français : ne recrée ni ne modifie l'existant (recrée un élément renommé ou supprimé).
- Premier administrateur réel : `npm run create-admin -- --name "…" --email … [--country tn]`. Le mot de passe (12 caractères min.) vient de `ADMIN_PASSWORD` ou d'une saisie masquée — **jamais en argument** (`--password` est refusé). L'e-mail est enregistré en minuscules.
- Les scripts n'affichent jamais `DATABASE_URL` : `prisma/script-utils.js` ne sort que l'hôte, le port et le nom de la base.

### Espace Secrétariat (routes admin et pages)
- **Route admin serveur** — toujours les deux middlewares, dans cet ordre :
```javascript
app.put('/api/admin/xxx/:id', requireAuth, requireRole('secretariat_admin'), async (req, res) => { /* ... */ });
```
  Valider les entrées côté serveur (voir Backend) et répondre 400/404/409 avec un message clair. Les lectures de données **publiques** (`/api/twgs`, `/api/countries`) sont réutilisées par l'admin au lieu d'être dupliquées.
- **Gardes-fous existants** : un admin ne peut ni se désactiver lui-même, ni changer son propre niveau (409) ; un pays lead/co-lead d'un GTT ou ayant des utilisateurs ne se supprime pas (409).
- **Page admin client** — route fille de `secretariat`, écrite **à l'intérieur** du `<ProtectedRoute allowedLevels={['secretariat_admin']}>` d'`App.jsx` (voir le commentaire dans le fichier), plus un onglet dans `SecretariatLayout.jsx`. Modèle à copier : `TwgAdmin.jsx` (tableau + formulaire d'édition, `apiGet`/`apiPut` de `utils/api.js`).
- **ESLint** : la règle `react-hooks/set-state-in-effect` interdit tout `setState` **synchrone** dans un `useEffect` (y compris via une fonction appelée par l'effet). Ne pas écrire `setLoading(true)` au début de la fonction de chargement : `loading` vaut déjà `true` au premier rendu. Si un rechargement déclenché par une action doit réafficher « Chargement… », faire `setLoading(true)` dans le gestionnaire d'événement (motif `reloadNews()` / `changeFilter()` de `ContentManagement.jsx` / `UserManagement.jsx`). `npx eslint src` doit rester à **0 erreur**.

### Hygiène du dépôt
- `server/.env` n'est **jamais** versionné (secrets : `JWT_SECRET`, `DATABASE_URL`). Le modèle est `server/.env.example`. `node_modules/` est ignoré par le `.gitignore` racine.
- Fins de ligne : `.gitattributes` impose LF dans le dépôt (Windows inclus). Ne pas committer de fichiers de travail (patchs, scripts jetables) : vérifier `git status` et ajouter les fichiers un par un plutôt que `git add -A`.

## État d'avancement (Phases 0 à 3 construites, audit A-D corrigé, préparation au déploiement faite)
> ⚠️ Cette section doit être mise à jour à chaque fin de tâche, en vérifiant l'état réel du code (`ls`, lecture des fichiers) — pas de supposition. Dernière vérification complète : 09/11/2026, branche `preparation-deploiement` (non poussée).

**Phase 0 — fondations** ✅ CSS extrait, i18n (FR/EN/AR + RTL), routeur, Layout (header/footer), `Flag.jsx`, `lang.js`.

**Phase 1 — site public** ✅ sauf Portail RIMS
- ✅ Accueil, Gouvernance, États membres, Groupes de travail (liste + fiche `/groupes-de-travail/:id`), Bibliothèque (filtre public dans le `where` Prisma), Actualités, Contact, Réclamations — pages présentes et routées dans `App.jsx`.
- ✅ Formulaires publics : `POST /api/complaints`, `POST /api/contact` (limités en débit).
- ✅ `NotFound.jsx` (`path="*"`).
- ⏳ **Portail RIMS** (`/portail-rims`) : toujours `ComingSoon` — seule page publique non construite.
- ⏳ Fiche pays `/etats-membres/:id` : n'existe pas (la maquette la prévoit, `pageMemberDetail`) ; les cartes pays ne sont pas cliquables.

**Phase 2 — authentification** ✅ `Login.jsx`, `AuthContext.jsx`, `ProtectedRoute.jsx`, `MonEspace.jsx` ; `POST /api/auth/login`, `GET /api/auth/me` ; middlewares `requireAuth` et `requireRole` ; niveaux `reader | contributor | validator | country_admin | secretariat_admin`.

**Phase 3 — espace Secrétariat** ✅
- ✅ Tableau de bord, Comptes pays (CRUD), Utilisateurs (CRUD + activation), Circuit documentaire (changement de statut), Gestion du contenu (actualités CRUD), Groupes de travail (édition).
- ✅ Les 17 routes `/api/admin/*` exigent `requireAuth` + `requireRole('secretariat_admin')` (recompté le 09/11 ; l'ancien chiffre « 18 » comptait une ligne de commentaire).
- ✅ Critère de la méthodologie rejoué le 09/11 dans Chrome headless (base de test) : téléphone de la Tunisie modifié via Comptes pays → nouvelle valeur affichée sur `/contact`.
- ✅ Les 4 pages Actualités, Pays, Documents, Utilisateurs testées dans Chrome headless (liste, création, modification, suppression/désactivation, filtre, erreurs du serveur), comportement identique avant/après la correction D.

**Audit de sécurité / qualité** (branche `preparation-deploiement`)
- ✅ **A — révocation de session** (`52be0ce`) : `requireAuth` relit `isActive` et `level` en base ; testé avec un vrai jeton (désactivation → 401 immédiat, rétrogradation → 403 immédiat) et dans Chrome headless (renvoi vers `/connexion` avec message ; panne réseau → jeton conservé + « Réessayer »).
- ✅ **B — identifiants numériques** (`7167293`) : `parseId` sur les 5 routes ; `abc`, `-1`, `0`, `1.5`, `1e3`, valeur > Int32 → 400.
- ✅ **C — validation des actualités** (`bea49e3`) : `validateNewsBody` (POST/PUT).
- ✅ **D — ESLint** (`f714a25`) : `npx eslint src` → 0 erreur. `useAuth` garde un `eslint-disable-next-line react-refresh/only-export-components` justifié en commentaire (la règle ne concerne que le rechargement à chaud de Vite).
- ✅ **F — documentation** : cette mise à jour, `DEPLOY.md`, `client/README.md`, les deux `.env.example`.
- ✅ Au-delà de l'audit, sur la même branche : adresse de l'API configurable (`7569972`), validation de POST/PUT `/api/admin/users` (`f742799`), garde contre l'auto-rétrogradation (`6b7f096`), CORS en liste blanche + helmet + limitation de débit (`6e11ef0`), démarrage production (`9adea4f`, `f6b6b21`), `TRUST_PROXY` (`e1d96d9`), seeds séparés (`5fcd4ea`), `create-admin` (`e9bfe77`), personnes du seed de démo rendues fictives (`2434250`).
- ✅ Correctif après relecture externe (`6a618e2`) : e-mails des comptes normalisés en minuscules (création, modification, `create-admin`, connexion). Testé : création avec majuscules puis connexion en minuscules, majuscules et casse mixte (200), doublons en autre casse (409, API et `create-admin`), modification avec majuscules, comptes du seed de démo connectables, requêtes de normalisation de `DEPLOY.md` sur une base avec et sans conflit de casse. `DEPLOY.md` complété : `DATABASE_URL` jamais dans une commande, saisie masquée testée en bash (`ee5b60d`) ; SSL de la base et prévisualisations Vercel (`c3510e0`).
- ⏳ **Test à deux onglets non confirmé** : la désactivation « depuis un autre onglet » a été simulée par un appel API, pas faite dans deux vrais onglets d'un même navigateur.
- ⏳ Non vérifiés faute d'environnement : saisie masquée de `create-admin` (pas de terminal interactif), historique PSReadLine réel des commandes PowerShell de `DEPLOY.md` (`ADMIN_PASSWORD`, `DATABASE_URL`), connexion à une base avec SSL, comportement sur un hébergeur réel (proxys / `TRUST_PROXY`, port, réécriture `vercel.json`), rendu visuel et arabe/RTL des messages ajoutés (en français seulement).
- Nettoyage du 09/11 : `server/.env` et `server/node_modules` retirés du suivi Git, `.gitignore` racine, `.env.example` et `.gitattributes` ajoutés. ⚠️ L'ancien `JWT_SECRET` reste lisible dans l'historique Git public : il doit être remplacé par un nouveau secret dans chaque environnement.
- ⚠️ Les bases de dev créées avant `2434250` contiennent encore les anciens comptes de démo (noms réels, domaines des agences) : les recréer (`npm run seed` sur une base vide) pour n'avoir que les comptes fictifs.

**Phase 4 — au-delà du MVP** ❌ pas commencée. À ne démarrer qu'une fois les Phases 0-3 stables (voir méthodologie) : versionnage des documents, missions, réunions/discussions de GTT, budget, veille réglementaire, répertoire d'experts, espace national par persona, chatbots.

**Ordre recommandé ensuite** : premier déploiement en suivant `DEPLOY.md` (et sa checklist) → Portail RIMS et fiche pays → Phase 4.

## Règle de travail
**Une tâche à la fois.** Ne pas convertir plusieurs pages dans la même réponse sans validation intermédiaire — l'objectif est que chaque étape soit comprise et vérifiée avant de passer à la suivante.

**Vérifier avant de faire confiance à ce fichier.** La section "État d'avancement" ci-dessus peut être en retard sur la réalité (fichiers annoncés faits mais jamais appliqués côté utilisateur). Avant de construire quoi que ce soit, vérifier sur le disque (`ls`, lecture du fichier) que ce qui est marqué ✅ existe vraiment. Mettre à jour cette section immédiatement après chaque tâche terminée.

**Redémarrer le serveur API** après toute modification de `server/index.js` quand il est lancé par `node index.js` (ou `npm start`) : ce processus ne recharge pas le fichier tout seul. `npm run dev` (nodemon) le fait automatiquement. Symptôme typique d'un serveur pas redémarré : `Cannot GET /api/…` alors que la route est bien écrite.
