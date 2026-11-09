// ============================================================
// client/src/App.jsx — VERSION COMPLÈTE (MVP Phases 0 à 3)
//
// Le ROUTEUR de l'application : définit quelle page s'affiche
// pour quelle URL, toutes enveloppées dans <Layout>.
// ============================================================

import { BrowserRouter, Routes, Route } from 'react-router-dom';

// --- Coquille et pages publiques ---
import Layout from './components/Layout';
import Home from './pages/Home';
import Members from './pages/Members';
import Twgs from './pages/Twgs';
import TwgDetail from './pages/TwgDetail';
import Library from './pages/Library';
import Governance from './pages/Governance';
import Actualites from './pages/Actualites';
import Contact from './pages/Contact';
import Reclamations from './pages/Reclamations';
import ComingSoon from './pages/ComingSoon';
import NotFound from './pages/NotFound';

// --- Authentification ---
import Login from './pages/Login';
import MonEspace from './pages/MonEspace';
import ProtectedRoute from './components/ProtectedRoute';

// --- Espace Secrétariat ---
import SecretariatLayout from './pages/secretariat/SecretariatLayout';
import Dashboard from './pages/secretariat/Dashboard';
import CountryAccounts from './pages/secretariat/CountryAccounts';
import UserManagement from './pages/secretariat/UserManagement';
import DocumentWorkflow from './pages/secretariat/DocumentWorkflow';
import ContentManagement from './pages/secretariat/ContentManagement';
import TwgAdmin from './pages/secretariat/TwgAdmin';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Toutes les routes filles s'affichent à l'intérieur de <Layout> (via <Outlet/>) */}
        <Route path="/" element={<Layout />}>

          {/* ---------- Pages publiques ---------- */}
          <Route index element={<Home />} />
          <Route path="gouvernance" element={<Governance />} />
          <Route path="etats-membres" element={<Members />} />
          <Route path="groupes-de-travail" element={<Twgs />} />
          <Route path="groupes-de-travail/:id" element={<TwgDetail />} />
          <Route path="bibliotheque" element={<Library />} />
          <Route path="actualites" element={<Actualites />} />
          <Route path="contact" element={<Contact />} />
          <Route path="reclamations" element={<Reclamations />} />

          {/* Rubrique annoncée dans le menu mais pas encore construite. */}
          <Route path="portail-rims" element={<ComingSoon titleKey="nav.portal" />} />

          {/* ---------- Authentification ---------- */}
          <Route path="connexion" element={<Login />} />
          <Route
            path="mon-espace"
            element={
              <ProtectedRoute>
                <MonEspace />
              </ProtectedRoute>
            }
          />

          {/* ---------- Espace Secrétariat ----------
              Réservé au rôle secretariat_admin.
              ⚠️ RÈGLE : toute page de l'espace DOIT être une route fille
              écrite ENTRE les balises ci-dessous. Placée après la
              fermeture, elle échapperait au ProtectedRoute et serait
              accessible à n'importe qui. */}
          <Route
            path="secretariat"
            element={
              <ProtectedRoute allowedLevels={['secretariat_admin']}>
                <SecretariatLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="pays" element={<CountryAccounts />} />
            <Route path="utilisateurs" element={<UserManagement />} />
            <Route path="documents" element={<DocumentWorkflow />} />
            <Route path="contenu" element={<ContentManagement />} />
            <Route path="groupes-de-travail" element={<TwgAdmin />} />
          </Route>

          {/* Toute autre adresse : message d'erreur, pas d'écran blanc. */}
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;