// ============================================================
// client/src/main.jsx
// Point d'entrée : monte React sur la page, après avoir chargé
// la configuration des traductions.
// ============================================================

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import './i18n';   // charge la config i18next AVANT que App se lance
import { AuthProvider } from './context/AuthContext';
import { SiteContentProvider } from './context/SiteContentContext';
import App from './App.jsx';
import { inject } from '@vercel/analytics';

// Mesure d'audience : Vercel Web Analytics, en PRODUCTION seulement.
// - import.meta.env.PROD est fixé au build par Vite : dans un build de
//   développement, la branche disparaît et aucun script n'est chargé.
// - mode 'production' explicite : la détection automatique du paquet
//   repose sur NODE_ENV, que Vite n'expose pas dans le navigateur.
// - Le script (/_vercel/insights/script.js, même domaine que le site) est
//   chargé en defer ; s'il est bloqué ou introuvable, le paquet ne fait
//   qu'un console.log : aucun effet sur l'affichage.
// À mentionner dans la page de confidentialité.
if (import.meta.env.PROD) {
  inject({ mode: 'production' });
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <SiteContentProvider>
        <App />
      </SiteContentProvider>
    </AuthProvider>
  </StrictMode>,
);