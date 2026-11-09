# NA-MRH Digital Platform — Contexte projet pour Claude Code

## Résumé
Plateforme de collaboration régionale (harmonisation réglementaire pharmaceutique, Afrique du Nord). Conversion d'une maquette HTML statique vers une vraie application React + Express + PostgreSQL.

## Stack technique
- **Frontend** : `client/` — React (Vite), react-router-dom, react-i18next
- **Backend** : `server/` — Node.js, Express, Prisma 7 (avec driver adapter `@prisma/adapter-pg`)
- **Base de données** : PostgreSQL (Docker local, port 5433)

## Fichiers de référence — à consulter avant de coder quoi que ce soit

| Fichier | Rôle |
|---|---|
| `reference/maquette.html` | **Source de vérité pour le design et le contenu.** Contient tout le CSS (classes exactes à réutiliser), les textes FR/EN/AR, et la logique métier de chaque page. Ne jamais réinventer un style : chercher la classe CSS correspondante dans son `<style>`. |
| `server/prisma/schema.prisma` | **Source de vérité pour la structure des données.** Les noms de champs diffèrent parfois de la maquette (ex. `twg.nameFr` en base, alors que la maquette écrivait `w.name.fr`). Toujours vérifier le schéma avant d'écrire une requête. |
| `server/prisma/seed.js` | Données de test déjà en base — ne pas dupliquer, s'en servir pour vérifier qu'une route renvoie bien quelque chose. |
| `METHODOLOGIE_CONVERSION_REACT.md` | **Le plan de conversion, phase par phase.** Ne pas construire une fonctionnalité de Phase 3 avant que les Phases 0-2 soient terminées. |
| `MATRICE_HABILITATIONS.md` | Qui a le droit de faire quoi. À respecter dès qu'une route touche à des données sensibles ou à une action de modification. |

## Conventions déjà établies (à reproduire, pas à réinventer)

### Pages
- Une page = un fichier dans `client/src/pages/NomPage.jsx`
- Pattern standard pour une page qui lit des données :
```jsx
const [data, setData] = useState([]);
const [loading, setLoading] = useState(true);
const [error, setError] = useState(null);

useEffect(() => {
  fetch('http://localhost:4000/api/...')
    .then((r) => r.json())
    .then((d) => { setData(d); setLoading(false); })
    .catch((e) => { setError('...'); setLoading(false); });
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
- `client/src/utils/lang.js` — `pickLang` (voir ci-dessus)
- `client/src/components/Flag.jsx` — `<Flag code="tn" title="Tunisie" />`, portage du `flagIcon()` de la maquette. Cinq drapeaux sont dessinés en SVG ; celui de l'Égypte est l'image officielle, extraite du base64 de la maquette vers `client/public/flags/eg.png`.

### CSS
- **Toujours** utiliser les classes réelles de `reference/maquette.html` (`className="twg-card"`, pas de `style={{...}}` improvisé)
- ⚠️ **Piège connu** : la maquette utilise des `<button>` pour beaucoup d'éléments cliquables (cartes, liens de nav). React Router (`<Link>`, `<NavLink>`) génère des `<a>`. Si le CSS de la maquette cible `.xxx button`, et qu'on utilise un `<Link>`, il faut ajouter la même règle pour `.xxx a` (voir `client/src/index.css`, section "CORRECTIF" en bas de fichier, pour des exemples déjà traités).

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

## État d'avancement (Phase 1 en cours)
> ⚠️ Cette section doit être mise à jour à chaque fin de tâche, en vérifiant l'état réel du code (`ls`, lecture des fichiers) — pas de supposition. Un décalage a déjà été trouvé le 16/09 (Twgs.jsx annoncé fait, mais absent du disque).

- ✅ Phase 0 complète : CSS extrait, i18n (FR/EN/AR + RTL), routeur, Layout (header/footer) — vérifié présent
- ✅ Page États membres (`/etats-membres`) + route `/api/countries` — reprise le 16/09 : grille `.country-card` de la maquette, `pickLang`, drapeaux via `<Flag>`, bloc `membersPage` dans les 3 locales. Cartes non cliquables (la fiche pays `/etats-membres/:id` n'existe pas encore) : le `.cta` « Contact → » de la maquette est donc omis pour l'instant.
- ✅ Page Groupes de travail, liste (`/groupes-de-travail`) + route `/api/twgs` — fait le 16/09 (`Twgs.jsx`, `utils/lang.js`, blocs `twgsPage` + `common`). Cartes cliquables via `<Link className="twg-card">`.
- ✅ Fiche détail GTT (`/groupes-de-travail/:id`) + route `/api/twgs/:id` — fait le 16/09 (`TwgDetail.jsx`). Renvoie 404 sur un slug inconnu, affiché comme message et non comme panne.
- ✅ Bibliothèque (`/bibliotheque`) + route `/api/documents` — fait le 16/09 (`Library.jsx`). Filtre public appliqué **dans le `where` Prisma** (voir règle de sécurité ci-dessous). Renvoie `{ documents, restrictedCount }`.
- ✅ Pages d'attente — `ComingSoon.jsx` (Gouvernance, Portail RIMS, Contact, Réclamations) et `NotFound.jsx` (`path="*"`), ajoutées le 16/09. Plus aucune URL du menu ne mène à un écran blanc. **En construisant une de ces pages, remplacer sa ligne `ComingSoon` dans `App.jsx` par la vraie page.**
- ⏳ À faire ensuite : Gouvernance, Actualités, Contact, Réclamations (dans cet ordre, voir méthodologie). Fiche pays `/etats-membres/:id` à caler avec le client — la maquette la prévoit (`pageMemberDetail`), la méthodologie ne la liste pas.
- ❌ Pas commencé : authentification, espace Secrétariat (Phase 2-3)

## Règle de travail
**Une tâche à la fois.** Ne pas convertir plusieurs pages dans la même réponse sans validation intermédiaire — l'objectif est que chaque étape soit comprise et vérifiée avant de passer à la suivante.

**Vérifier avant de faire confiance à ce fichier.** La section "État d'avancement" ci-dessus peut être en retard sur la réalité (fichiers annoncés faits mais jamais appliqués côté utilisateur). Avant de construire quoi que ce soit, vérifier sur le disque (`ls`, lecture du fichier) que ce qui est marqué ✅ existe vraiment. Mettre à jour cette section immédiatement après chaque tâche terminée.

**Redémarrer le serveur API** après toute modification de `server/index.js` : le processus Node ne recharge pas le fichier tout seul (pas de nodemon configuré). Symptôme typique : `Cannot GET /api/…` alors que la route est bien écrite.