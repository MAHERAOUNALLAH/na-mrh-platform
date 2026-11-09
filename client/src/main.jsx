// ============================================================
// client/src/main.jsx
// Point d'entrée : monte React sur la page, après avoir chargé
// la configuration des traductions.
// ============================================================

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import './i18n';  
import { AuthProvider } from './context/AuthContext';       // charge la config i18next AVANT que App se lance
import App from './App.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>,
);