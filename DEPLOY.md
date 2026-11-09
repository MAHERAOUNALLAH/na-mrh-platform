# Mise en ligne de NA-MRH

Procédure de déploiement, **dans l'ordre**. Elle reste générique : les
noms de menus et de réglages varient d'un hébergeur à l'autre ; ce
document ne présume d'aucun hébergeur en particulier.

Architecture visée :

| Partie | Dossier | Hébergement |
|---|---|---|
| Site (React + Vite, fichiers statiques) | `client/` | Vercel |
| API (Node.js + Express) | `server/` | un hébergeur Node.js |
| Base de données | — | PostgreSQL hébergé |

Prérequis : Node.js `^20.19`, `^22.12` ou `>=24` (exigence de Prisma 7,
déclarée dans `server/package.json`), PostgreSQL accessible depuis
l'hébergeur de l'API.

---

## 1. Créer la base PostgreSQL

Créez une base **vide** chez l'hébergeur de votre choix et notez son
URL de connexion (`postgresql://utilisateur:motdepasse@hôte:port/base`).
Cette URL contient un mot de passe : elle ne doit apparaître que dans
les variables d'environnement de l'API, jamais dans le code ni dans un
ticket ou un message.

## 2. Variables d'environnement de l'API (`server/`)

Toutes sont documentées dans `server/.env.example`. Sur l'hébergeur, on
les déclare dans son interface (pas de fichier `.env` en production).

| Variable | Obligatoire | Rôle |
|---|---|---|
| `DATABASE_URL` | oui | URL de la base créée à l'étape 1. |
| `JWT_SECRET` | oui | Signe les jetons de connexion. **32 caractères minimum** en production, aléatoire, propre à cet environnement : `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`. Ne jamais réutiliser l'ancien secret présent dans l'historique Git. |
| `NODE_ENV` | oui | `production`. Active les vérifications strictes et rend la limitation de débit impossible à couper. |
| `CORS_ORIGIN` | oui | Adresse(s) du site, séparées par des virgules, sans `/` final : `https://<projet>.vercel.app` (+ le domaine personnalisé s'il existe). Le serveur refuse de démarrer si elle est vide en production. |
| `TRUST_PROXY` | conseillée | Nombre de proxys devant l'API. Défaut `1`. `0` = aucun proxy ; `1` = un proxy (cas courant chez les hébergeurs) ; `2` = deux (ex. CDN + hébergeur). **Une mauvaise valeur casse la limitation de débit sans erreur visible** : voir la vérification 5 en fin de document. |
| `PORT` | non | Port d'écoute. La plupart des hébergeurs le fournissent eux-mêmes : ne pas le fixer à la main sauf indication contraire. Défaut `4000`. |
| `RATE_LIMIT_LOGIN_MAX`, `RATE_LIMIT_FORMS_MAX` | non | Plafonds de la limitation de débit (défauts : 10 échecs de connexion / 15 min, 5 envois / heure par formulaire). |

À **ne pas** définir en production : `RATE_LIMIT_DISABLED` (ignorée de
toute façon quand `NODE_ENV=production`), `ALLOW_DEMO_SEED`.

Le serveur **refuse de démarrer** avec un message explicite si
`DATABASE_URL` ou `JWT_SECRET` manque, si `JWT_SECRET` est trop court
ou si `CORS_ORIGIN` est vide en production.

## 3. Installer et construire l'API

Dossier racine du service : `server/`.

- Installation : `npm ci` (ou `npm install`). Le script `postinstall`
  exécute `prisma generate`, qui **n'a pas besoin** de `DATABASE_URL`.
  `prisma` fait partie des `dependencies`, donc une installation avec
  `NODE_ENV=production` (sans les devDependencies) fonctionne.
- Si l'hébergeur demande une commande de build : `npm run build`
  (`prisma generate`).
- Commande de démarrage : `npm start` (`node index.js`).

## 4. Créer les tables : `migrate:deploy`

Les étapes 4, 5 et 6 s'exécutent depuis `server/`, avec `DATABASE_URL`
pointant sur la base de production. Deux façons de faire :

- **Console / shell de l'hébergeur de l'API** (si elle existe) : la
  variable y est déjà définie (étape 2), rien à saisir. C'est la
  solution la plus simple.
- **Depuis un poste local** (dépôt cloné, `npm ci` fait dans `server/`) :
  renseignez la variable **par une saisie masquée**, une seule fois
  pour les étapes 4 à 6 :
  - bash, en **deux commandes** : `read -rs DATABASE_URL` (collez l'URL
    puis Entrée ; rien ne s'affiche), puis `export DATABASE_URL` ;
  - PowerShell : `$env:DATABASE_URL = [Runtime.InteropServices.Marshal]::PtrToStringBSTR([Runtime.InteropServices.Marshal]::SecureStringToBSTR((Read-Host -AsSecureString 'DATABASE_URL')))`.

  Une variable ainsi définie **l'emporte** sur un éventuel
  `server/.env` local (dotenv ne remplace pas une variable déjà
  présente). Effacez-la après l'étape 6 : `unset DATABASE_URL` (bash) ou
  `Remove-Item Env:DATABASE_URL` (PowerShell).

  ⚠️ **Vérifiez la base visée avant d'aller plus loin.** Si la variable
  n'est pas réellement transmise (export oublié ou qui a échoué), les
  commandes retombent **sans prévenir** sur `server/.env`, c'est-à-dire
  en général sur votre base de développement. Chaque commande affiche
  la base qu'elle utilise, sans mot de passe : `Datasource "db":
  PostgreSQL database "…" … at "…"` pour `migrate:deploy`, `base : …`
  pour `seed:reference` et `create-admin`. Si ce n'est pas la base de
  production, arrêtez-vous.

⚠️ **Ne jamais écrire `DATABASE_URL` dans une commande**
(`DATABASE_URL=postgresql://… npm run …`, `$env:DATABASE_URL = 'postgresql://…'`,
`psql postgresql://…`) : elle contient le mot de passe de la base et
resterait dans l'historique du shell — même raison que pour
`ADMIN_PASSWORD` à l'étape 6.

```bash
npm run migrate:deploy
```

Applique les migrations de `server/prisma/migrations/`. Sans danger à
relancer : seules les migrations manquantes sont appliquées. À refaire
à chaque déploiement qui ajoute une migration.

## 5. Données de référence : `seed:reference`

```bash
npm run seed:reference
```

Crée les 12 fonctions réglementaires, les 6 pays et les 5 groupes de
travail. **Aucun utilisateur, aucun mot de passe.** Sans danger à
relancer : un enregistrement existant n'est **jamais** modifié, ce qui
préserve les coordonnées et descriptions corrigées depuis l'Espace
Secrétariat.

⛔ Ne **jamais** lancer `npm run seed` ni `npm run seed:demo` sur la base
de production : ils créent des comptes de test au mot de passe public
`password123`. `seed:demo` refuse d'ailleurs de tourner si la base
n'est pas locale ou si `NODE_ENV=production`.

## 6. Premier administrateur : `create-admin`

```bash
npm run create-admin -- --name "Prénom Nom" --email adresse@domaine.org --country tn
```

`--country` est facultatif (omis = Secrétariat régional). Le compte créé
est `secretariat_admin` et actif. Le mot de passe (12 caractères
minimum) n'est **jamais** passé en argument :

- **saisie masquée** : lancer la commande sans `ADMIN_PASSWORD`, dans
  un vrai terminal ; le mot de passe est demandé deux fois, sans écho ;
- **ou variable `ADMIN_PASSWORD`**, renseignée sans que sa valeur
  apparaisse dans une ligne de commande :
  - bash : `read -rs ADMIN_PASSWORD && export ADMIN_PASSWORD`, puis
    la commande, puis `unset ADMIN_PASSWORD` ;
  - PowerShell : `$env:ADMIN_PASSWORD = [Runtime.InteropServices.Marshal]::PtrToStringBSTR([Runtime.InteropServices.Marshal]::SecureStringToBSTR((Read-Host -AsSecureString 'Mot de passe')))`,
    puis la commande, puis `Remove-Item Env:ADMIN_PASSWORD`.
    La ligne enregistrée dans l'historique est la commande elle-même,
    qui ne contient pas le mot de passe : celui-ci est tapé en réponse
    à `Read-Host` (affiché en `*`), pas comme une commande. Pour le
    vérifier après coup, affichez les lignes d'historique qui
    mentionnent la variable et relisez-les : aucune ne doit contenir le
    mot de passe (ne tapez surtout pas le mot de passe dans une
    commande de recherche, il entrerait à son tour dans l'historique) :
    `Select-String ADMIN_PASSWORD (Get-PSReadLineOption).HistorySavePath`

⚠️ À éviter : `ADMIN_PASSWORD=… npm run create-admin …` (bash) ou
`$env:ADMIN_PASSWORD = '…'` (PowerShell) — la valeur, écrite dans la
commande, resterait dans l'historique du shell.

L'adresse est enregistrée **en minuscules** (`Admin.Reel@…` devient
`admin.reel@…`) ; la connexion fonctionne ensuite quelle que soit la
casse tapée. Le script refuse si l'adresse existe déjà, quelle que soit
sa casse. Les comptes suivants se créent depuis l'Espace Secrétariat →
Utilisateurs (même règle des minuscules).

Fin des étapes en ligne de commande : si vous avez saisi `DATABASE_URL`
et `ADMIN_PASSWORD` sur un poste local, effacez-les maintenant
(`unset DATABASE_URL ADMIN_PASSWORD` en bash ;
`Remove-Item Env:DATABASE_URL, Env:ADMIN_PASSWORD` en PowerShell).

## 7. Démarrer l'API

Lancez (ou redéployez) le service. Le journal de démarrage affiche une
ligne récapitulative **sans aucun secret**, par exemple :

```
Configuration : NODE_ENV=production | origines CORS=1 | trust proxy=1 | limitation de débit=active
```

Vérifiez-la, puis : `https://<adresse-de-l-api>/api/health` doit
répondre `{"status":"ok",…}`.

## 8. Variables du site et déploiement sur Vercel (`client/`)

| Variable | Rôle |
|---|---|
| `VITE_API_URL` | Adresse publique de l'API, **sans** `/` final ni `/api` : `https://<adresse-de-l-api>`. |

- Projet Vercel avec **Root Directory** = `client`, build `npm run build`,
  sortie `dist` (voir `client/README.md`).
- `VITE_API_URL` est **inscrite dans le JavaScript au moment du build** :
  après l'avoir modifiée, il faut **relancer un déploiement**. Elle est
  visible de tous : jamais de secret dans une variable `VITE_*`.
- `client/vercel.json` renvoie toute URL vers `index.html` (routes React).
- Si l'adresse finale du site diffère de celle mise dans `CORS_ORIGIN`
  (domaine personnalisé ajouté ensuite…), mettez `CORS_ORIGIN` à jour
  côté API et redémarrez-la.

---

## Checklist « après le déploiement »

À faire depuis un navigateur, sur l'adresse publique du site.

- [ ] **1. Pages publiques** : l'accueil affiche les pays et les groupes
  de travail (preuve que le site joint l'API et que `seed:reference` a
  tourné).
- [ ] **2. CORS depuis le site** : ouvrez les outils de développement
  (F12) → Console : aucune erreur « blocked by CORS policy ». Onglet
  Réseau : la réponse d'un appel à `/api/countries` contient
  `Access-Control-Allow-Origin: https://<votre site>`. En cas d'erreur
  CORS : `CORS_ORIGIN` ne correspond pas exactement à l'adresse du site
  (schéma `https://`, sous-domaine, pas de `/` final).
- [ ] **3. Connexion** : `/connexion` avec le compte créé à l'étape 6 →
  « Mon espace », puis l'Espace Secrétariat s'ouvre et le tableau de
  bord affiche des chiffres.
- [ ] **4. URL profonde** : ouvrez directement
  `https://<votre site>/groupes-de-travail`, puis actualisez (F5) : la
  page s'affiche, pas une erreur 404 de Vercel.
- [ ] **5. `TRUST_PROXY` (limitation de débit par visiteur)** :
  1. dans un navigateur A, tapez **11 mots de passe faux** sur
     `/connexion` : la 11ᵉ tentative doit afficher « Trop de tentatives
     de connexion… » ;
  2. **depuis une autre connexion Internet** (téléphone en 4G/5G,
     Wi-Fi désactivé — un autre onglet ou un autre navigateur sur le
     même réseau ne suffit pas, il partage la même IP publique),
     connectez-vous avec un compte valide : la connexion doit
     **réussir** ;
  3. si elle est refusée avec « Trop de tentatives » : tous les
     visiteurs partagent un compteur → `TRUST_PROXY` est trop bas
     (souvent `0` alors qu'un proxy est présent). Augmentez-le, redémarrez,
     attendez 15 minutes (ou redémarrez l'API, ce qui remet les
     compteurs à zéro) et refaites le test ;
  4. une valeur trop haute ne se voit pas à ce test (elle permet à un
     attaquant de contourner la limite) : ne mettez pas plus que le
     nombre réel de proxys indiqué par l'hébergeur.
- [ ] **6. Aucun compte de test** : depuis Espace Secrétariat →
  Utilisateurs, seul l'administrateur créé à l'étape 6 apparaît ;
  le compte de démo `r.jaziri@example.org` / `password123` est refusé.
- [ ] **7. Secrets** : `JWT_SECRET` de production est neuf (pas celui de
  l'historique Git), et `ADMIN_PASSWORD` n'est plus définie sur
  l'hébergeur ni dans votre session.

---

## Annexe — base déjà en service : e-mails en minuscules

Depuis cette version, les e-mails des comptes sont **enregistrés et
recherchés en minuscules** (création, modification et connexion). Une
base remplie **avant** cette règle peut contenir des adresses avec des
majuscules (ex. `Admin.Reel@exemple.org`) : leurs titulaires ne
pourraient plus se connecter, puisque la connexion cherche
`admin.reel@exemple.org`. Une base créée en suivant ce document n'est
pas concernée.

À exécuter dans la console SQL de l'hébergeur (ou `psql`), **sans écrire
l'URL de la base dans une commande** (voir l'étape 4), de préférence
après une sauvegarde :

**1. Lister d'abord les adresses qui ne diffèrent que par la casse.**

```sql
SELECT lower(trim(email)) AS adresse_normalisee,
       count(*)            AS comptes,
       string_agg(id || ' : ' || email, ' | ' ORDER BY id) AS detail
FROM users
GROUP BY lower(trim(email))
HAVING count(*) > 1;
```

Si cette requête renvoie des lignes, **ne pas lancer l'étape 2** : ces
comptes sont en conflit (même boîte aux lettres, plusieurs comptes).
Décidez lequel garder pour chaque adresse, et donnez aux autres une
adresse différente (ou désactivez-les et changez leur adresse) depuis
l'Espace Secrétariat, puis relancez la requête 1 jusqu'à ce qu'elle ne
renvoie plus rien. (Si l'étape 2 était lancée malgré tout, la contrainte
d'unicité de la colonne la ferait échouer en entier, sans rien modifier.)

**2. Normaliser.**

```sql
UPDATE users
SET email = lower(trim(email))
WHERE email <> lower(trim(email));
```

**3. Vérifier** : cette requête doit renvoyer `0`.

```sql
SELECT count(*) FROM users WHERE email <> lower(trim(email));
```
