# NA-MRH — site (client React + Vite)

## Développement local

```bash
npm install
npm run dev        # http://localhost:5173, appelle l'API sur http://localhost:4000
npm run lint
npm run build      # produit dist/
```

## Adresse de l'API : `VITE_API_URL`

Le client ne connaît l'adresse de l'API qu'à **un seul endroit** :
`src/utils/api.js`. Toutes les pages passent par ses helpers
(`apiGet`, `apiPost`, `apiPut`, `apiPatch`, `apiDelete`) — n'écrivez pas
de `fetch('http://...')` en dur dans une page.

| Variable | Rôle | Défaut |
|---|---|---|
| `VITE_API_URL` | Adresse publique du serveur API, sans `/` final ni `/api` | `http://localhost:4000` |

Voir `.env.example`. La valeur est **figée au moment du build** (Vite
l'inscrit dans le JavaScript) : après l'avoir changée sur l'hébergeur,
il faut relancer un build. Elle est visible par n'importe quel
visiteur : jamais de secret dans une variable `VITE_*`.

## Déploiement sur Vercel

- **Root Directory** du projet Vercel : `client`
- Framework : Vite (build `npm run build`, sortie `dist`)
- Variable d'environnement : `VITE_API_URL=https://<adresse de l'API>`
- `vercel.json` renvoie toute URL qui ne correspond pas à un fichier
  vers `index.html` : c'est React Router qui affiche ensuite la bonne
  page. Sans cette règle, actualiser `/groupes-de-travail` donnerait
  une 404 de Vercel.
- Côté serveur, l'API doit autoriser l'adresse du site Vercel en CORS
  (voir `server/.env.example`).
