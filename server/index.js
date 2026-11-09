// ============================================================
// NA-MRH — server/index.js — VERSION COMPLÈTE (MVP Phases 0 à 3)
//
// Organisation du fichier :
//   1. Imports et connexion à la base
//   2. Configuration du serveur
//   3. Middlewares d'authentification (requireAuth, requireRole)
//   4. Routes PUBLIQUES (aucune connexion nécessaire)
//   5. Routes d'AUTHENTIFICATION
//   6. Routes ADMIN (connexion + rôle secretariat_admin exigés)
//   7. Démarrage
//
// Lancement : node index.js   (depuis le dossier server/)
// ============================================================

// ============================================================
// 1. IMPORTS ET CONNEXION
// ============================================================

require('dotenv').config();                          // lit le fichier .env
const express = require('express');                  // le framework serveur
const cors = require('cors');                        // autorise les appels depuis React
const helmet = require('helmet');                    // en-têtes de sécurité HTTP
const { rateLimit } = require('express-rate-limit'); // limitation de débit par IP
const jwt = require('jsonwebtoken');                 // fabrique et vérifie les jetons de session
const bcrypt = require('bcryptjs');                  // hache et compare les mots de passe
const { PrismaClient, UserLevel, OrgRole } = require('@prisma/client');  // client base + enums du schéma
const { PrismaPg } = require('@prisma/adapter-pg');  // l'adaptateur Prisma 7
const { normalizeEmail, isValidEmail } = require('./utils/email');  // e-mails toujours en minuscules

// ------------------------------------------------------------
// Vérifications au démarrage : mieux vaut un serveur qui REFUSE de
// démarrer avec un message clair qu'un serveur qui tourne mal configuré.
// Toutes les variables sont décrites dans server/.env.example.
// ------------------------------------------------------------
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

function fatalConfig(message) {
  console.error(`❌ Configuration invalide : ${message}`);
  console.error('   Voir server/.env.example. Le serveur ne démarre pas.');
  process.exit(1);
}

if (!process.env.DATABASE_URL) {
  fatalConfig('DATABASE_URL est absente.');
}

// JWT_SECRET signe les jetons : quiconque le connaît peut fabriquer un
// jeton secretariat_admin. En production, il doit être long et aléatoire.
const JWT_SECRET_MIN_LENGTH = 32;
if (IS_PRODUCTION && (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < JWT_SECRET_MIN_LENGTH)) {
  fatalConfig(`en production (NODE_ENV=production), JWT_SECRET doit faire au moins ${JWT_SECRET_MIN_LENGTH} caractères. `
    + 'Générez-en un : node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'hex\'))"');
}
if (!process.env.JWT_SECRET) {
  fatalConfig('JWT_SECRET est absente (impossible de signer les jetons de connexion).');
}

// CORS : liste blanche des sites autorisés à appeler l'API depuis un
// navigateur. CORS_ORIGIN accepte plusieurs adresses séparées par des
// virgules (ex. "https://na-mrh.vercel.app,https://www.na-mrh.org").
// Sans variable : en local, seul le serveur de dev Vite (5173) ; en
// production, on refuse de démarrer (le site ne pourrait rien appeler).
const DEV_DEFAULT_ORIGINS = ['http://localhost:5173'];
const configuredOrigins = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map((o) => o.trim().replace(/\/+$/, ''))
  .filter(Boolean);
if (IS_PRODUCTION && configuredOrigins.length === 0) {
  fatalConfig('en production, CORS_ORIGIN doit lister l\'adresse du site (ex. https://na-mrh.vercel.app).');
}
const ALLOWED_ORIGINS = configuredOrigins.length > 0 ? configuredOrigins : DEV_DEFAULT_ORIGINS;

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

// ============================================================
// 2. CONFIGURATION DU SERVEUR
// ============================================================

const app = express();

// TRUST_PROXY = nombre de proxys entre Internet et ce serveur. Défaut : 1.
// Chez un hébergeur, la connexion TCP arrive presque toujours d'un proxy
// (répartiteur de charge), et la vraie adresse du visiteur n'est que dans
// l'en-tête X-Forwarded-For. Express lit cet en-tête en partant de la
// droite et saute autant d'entrées qu'il y a de proxys de confiance.
//   - Valeur TROP BASSE (0 alors qu'il y a un proxy) : req.ip vaut l'IP
//     du proxy pour TOUT le monde → un seul compteur pour tous les
//     visiteurs : 10 mots de passe faux de n'importe qui bloquent la
//     connexion de tous, 5 messages de contact bloquent le formulaire
//     pour tous.
//   - Valeur TROP HAUTE (1 alors que le serveur est exposé directement,
//     2 alors qu'il n'y a qu'un proxy) : req.ip vient d'une entrée que le
//     client écrit lui-même → un attaquant change d'IP à volonté et
//     contourne la limitation.
// Voir server/.env.example et la vérification dans DEPLOY.md.
const TRUST_PROXY = (() => {
  const raw = process.env.TRUST_PROXY;
  if (raw === undefined || raw === '') return 1;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 0) {
    fatalConfig(`TRUST_PROXY doit être un entier ≥ 0 : 0 = pas de proxy, 1 = un proxy devant le serveur (reçu : "${raw}").`);
  }
  return value;
})();
app.set('trust proxy', TRUST_PROXY);

// En-têtes de sécurité. L'API ne sert que du JSON, jamais de page HTML :
// la politique de contenu peut donc tout interdire (aucun script, aucune
// image, pas d'affichage dans un cadre). Le reste des réglages par défaut
// de helmet convient (nosniff, HSTS, pas de X-Powered-By…).
app.use(helmet({
  contentSecurityPolicy: {
    useDefaults: false,
    directives: { defaultSrc: ["'none'"], frameAncestors: ["'none'"] },
  },
}));

// Seules les origines de la liste blanche reçoivent l'en-tête
// Access-Control-Allow-Origin. Les autres sites n'obtiennent rien : le
// navigateur bloque alors la lecture de la réponse. (Une requête sans
// en-tête Origin — curl, serveur à serveur — n'est pas concernée par CORS.)
app.use(cors({ origin: ALLOWED_ORIGINS }));

app.use(express.json());      // permet de lire req.body sur les POST/PUT/PATCH

const PORT = Number(process.env.PORT) || 4000;   // l'hébergeur impose souvent son port via PORT

// ------------------------------------------------------------
// Limitation de débit (par IP). TOUJOURS active par défaut, et
// impossible à couper en production.
//   - Connexion : 10 ÉCHECS / 15 min. Les connexions réussies ne
//     comptent pas (skipSuccessfulRequests) : tout le personnel d'une
//     ANR sort souvent par la même IP publique, il ne doit pas se
//     bloquer lui-même ; un attaquant qui devine, lui, échoue.
//   - Formulaires publics (contact, réclamations) : 5 envois / heure.
// Réglages pour le développement et les tests :
//   RATE_LIMIT_LOGIN_MAX, RATE_LIMIT_FORMS_MAX : relèvent les plafonds ;
//   RATE_LIMIT_DISABLED=1 : coupe tout, IGNORÉ si NODE_ENV=production.
// ------------------------------------------------------------
function positiveIntFromEnv(name, fallback) {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 1) fatalConfig(`${name} doit être un entier positif (reçu : "${raw}").`);
  return value;
}
const RATE_LIMIT_DISABLED = process.env.RATE_LIMIT_DISABLED === '1' && !IS_PRODUCTION;
if (process.env.RATE_LIMIT_DISABLED === '1' && IS_PRODUCTION) {
  console.warn('⚠️  RATE_LIMIT_DISABLED=1 ignoré : la limitation de débit reste active en production.');
}

function makeLimiter({ windowMs, limit, message, skipSuccessfulRequests = false }) {
  return rateLimit({
    windowMs,
    limit,
    skipSuccessfulRequests,
    standardHeaders: 'draft-7',   // en-tête RateLimit-* : le client sait quand réessayer
    legacyHeaders: false,
    message: { error: message },  // même format JSON que nos autres erreurs
    skip: () => RATE_LIMIT_DISABLED,
  });
}
const loginLimiter = makeLimiter({
  windowMs: 15 * 60 * 1000,
  limit: positiveIntFromEnv('RATE_LIMIT_LOGIN_MAX', 10),
  skipSuccessfulRequests: true,
  message: 'Trop de tentatives de connexion depuis cette adresse. Réessayez dans 15 minutes.',
});
// Un compteur par formulaire : 5 messages de contact n'empêchent pas
// de déposer une réclamation.
const makePublicFormLimiter = () => makeLimiter({
  windowMs: 60 * 60 * 1000,
  limit: positiveIntFromEnv('RATE_LIMIT_FORMS_MAX', 5),
  message: 'Trop d\'envois depuis cette adresse. Réessayez dans une heure.',
});
const contactLimiter = makePublicFormLimiter();
const complaintsLimiter = makePublicFormLimiter();

// ============================================================
// 3. MIDDLEWARES D'AUTHENTIFICATION
// ============================================================

// "Êtes-vous connecté ?" — vérifie le jeton envoyé par le client.
// Si oui, req.user devient disponible dans la route et on continue
// avec next(). Sinon on arrête tout : la route ne s'exécute jamais.
//
// ⚠️ RÉVOCATION DE SESSION : le jeton ne prouve qu'une chose, « cette
// personne s'est connectée il y a moins de 7 jours ». Il ne dit rien de
// son compte AUJOURD'HUI. On relit donc l'utilisateur en base à CHAQUE
// requête, et ce sont son isActive et son level ACTUELS qui comptent :
//   - compte désactivé ou supprimé → 401 immédiat, même jeton valide ;
//   - compte rétrogradé → req.user.level est le nouveau niveau, donc
//     requireRole répond 403 dès la requête suivante.
// Ne jamais remplir req.user avec le level du jeton (il peut être périmé).
async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;   // format attendu : "Bearer xxxxx"
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Connexion requise.' });
  }

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    return res.status(401).json({ error: 'Session invalide ou expirée.' });
  }
  if (!Number.isInteger(payload.userId)) {
    return res.status(401).json({ error: 'Session invalide ou expirée.' });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, level: true, isActive: true },
    });
    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'Session révoquée : ce compte est désactivé ou n\'existe plus.' });
    }
    req.user = { userId: user.id, level: user.level };   // valeurs fraîches, pas celles du jeton
    next();
  } catch (error) {
    // Base injoignable : c'est une panne (500), pas un refus (401).
    // Le client ne doit pas effacer la session pour autant.
    console.error('Erreur requireAuth :', error);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
}

// Les identifiants numériques des routes (/api/admin/users/:id…) arrivent
// sous forme de texte. Number('abc') donne NaN, Number('-1') donne -1 :
// passés à Prisma, ils provoquent une erreur 500 au lieu d'un refus clair.
// parseId n'accepte qu'un entier strictement positif, écrit en chiffres
// simples, et tenant dans un Int PostgreSQL (32 bits). Sinon : null.
// Usage :
//   const userId = parseId(req.params.id);
//   if (userId === null) return res.status(400).json({ error: INVALID_ID_ERROR });
const MAX_INT_ID = 2147483647;
const INVALID_ID_ERROR = 'Identifiant invalide : un entier strictement positif est attendu.';
function parseId(raw) {
  if (typeof raw !== 'string' || !/^[1-9][0-9]*$/.test(raw)) return null;
  const id = Number(raw);
  return id <= MAX_INT_ID ? id : null;
}

// "Et avez-vous le bon rôle ?" — à placer TOUJOURS après requireAuth,
// qui est ce qui remplit req.user.
// Usage : app.get('/api/admin/xxx', requireAuth, requireRole('secretariat_admin'), ...)
function requireRole(...allowedLevels) {
  return (req, res, next) => {
    if (!allowedLevels.includes(req.user.level)) {
      return res.status(403).json({ error: 'Accès refusé : rôle insuffisant.' });
    }
    next();
  };
}

// ============================================================
// 4. ROUTES PUBLIQUES
// ============================================================

// --- Vérifier que le serveur vit ---
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Le serveur NA-MRH fonctionne 🎉' });
});

// --- Les pays membres ---
app.get('/api/countries', async (req, res) => {
  try {
    const countries = await prisma.country.findMany({
      orderBy: { nameFr: 'asc' },
    });
    res.json(countries);
  } catch (error) {
    console.error('Erreur /api/countries :', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// --- Les groupes de travail techniques ---
//
// "include" demande à Prisma de rapporter les lignes liées (pays lead,
// co-lead, fonction) dans la même réponse — sans quoi on n'aurait que
// des identifiants et il faudrait un second appel pour les noms.
app.get('/api/twgs', async (req, res) => {
  try {
    const twgs = await prisma.twg.findMany({
      include: {
        leadCountry: true,
        coleadCountry: true,
        function: true,
      },
      orderBy: [
        { wave: 'asc' },    // vague 1 d'abord, puis 2, puis 3
        { nameFr: 'asc' },  // à vague égale, ordre alphabétique
      ],
    });
    res.json(twgs);
  } catch (error) {
    console.error('Erreur /api/twgs :', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// --- Un seul GTT, par son slug ('ma-twg', 'gmp-twg'...) ---
app.get('/api/twgs/:id', async (req, res) => {
  try {
    const twg = await prisma.twg.findUnique({
      where: { id: req.params.id },
      include: { leadCountry: true, coleadCountry: true, function: true },
    });

    if (!twg) {
      return res.status(404).json({ error: 'Groupe de travail introuvable' });
    }
    res.json(twg);
  } catch (error) {
    console.error('Erreur /api/twgs/:id :', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// --- La bibliothèque documentaire PUBLIQUE ---
//
// ⚠️ RÈGLE DE SÉCURITÉ — NE JAMAIS DÉPLACER CE FILTRE CÔTÉ REACT.
//
// Invariant métier : un document n'est visible du public QUE SI
// status = published_public ET visibility = public.
//
// Ce filtre appartient au "where" de la requête, donc à la base : les
// documents internes et confidentiels ne quittent jamais le serveur.
// Le faire côté React reviendrait à les envoyer quand même au
// navigateur, où n'importe qui les lirait dans l'onglet Réseau.
//
// "select" plutôt que tout l'enregistrement : filePath est un chemin
// de stockage interne, createdById désigne une personne — rien de
// tout cela n'a à sortir sur une route publique.
const PUBLIC_DOCUMENT_FILTER = { status: 'published_public', visibility: 'public' };

app.get('/api/documents', async (req, res) => {
  try {
    const documents = await prisma.document.findMany({
      where: PUBLIC_DOCUMENT_FILTER,
      select: {
        id: true,
        titleFr: true, titleEn: true, titleAr: true,
        category: true, phase: true, version: true,
      },
      orderBy: [{ phase: 'asc' }, { titleFr: 'asc' }],
    });

    // On ne renvoie qu'un NOMBRE pour les documents restreints :
    // aucun titre, aucune métadonnée ne sort d'ici.
    const restrictedCount = await prisma.document.count({
      where: { NOT: PUBLIC_DOCUMENT_FILTER },
    });

    res.json({ documents, restrictedCount });
  } catch (error) {
    console.error('Erreur /api/documents :', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// --- Les actualités PUBLIÉES uniquement ---
//
// ⚠️ Le filtre publishedAt est indispensable : sans lui, les brouillons
// créés depuis l'Espace Secrétariat apparaîtraient sur le site public.
app.get('/api/news', async (req, res) => {
  try {
    const news = await prisma.news.findMany({
      where: { publishedAt: { not: null } },
      orderBy: { sortDate: 'desc' },
    });
    res.json(news);
  } catch (error) {
    console.error('Erreur /api/news :', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// --- Réclamations (écriture publique) ---
app.post('/api/complaints', complaintsLimiter, async (req, res) => {
  try {
    const { name, email, org, countryId, nature, message } = req.body;

    if (!name || !message) {
      return res.status(400).json({ error: 'Nom et message sont obligatoires.' });
    }

    const complaint = await prisma.complaint.create({
      data: { name, email, org, countryId: countryId || null, nature, message },
    });

    res.status(201).json(complaint);   // 201 = créé avec succès
  } catch (error) {
    console.error('Erreur POST /api/complaints :', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// --- Contact ---
//
// ⚠️ SIMPLIFICATION ASSUMÉE : il n'existe pas de table "messages de
// contact" dans le schéma. On valide les champs et on affiche le
// message dans la console — RIEN N'EST ENREGISTRÉ EN BASE. Si le
// client veut l'historique de ces messages, il faudra ajouter une
// table (ex. ContactMessage) avant la mise en production.
app.post('/api/contact', contactLimiter, async (req, res) => {
  try {
    const { name, email, org, message } = req.body;
    if (!name || !email || !message) {
      return res.status(400).json({ error: 'Nom, email et message sont obligatoires.' });
    }

    console.log('📨 Nouveau message de contact (non persisté) :', { name, email, org, message });

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Erreur POST /api/contact :', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ============================================================
// 5. ROUTES D'AUTHENTIFICATION
// ============================================================

// --- Connexion : vérifie l'email/mot de passe, renvoie un jeton ---
//
// Le JWT prouve, pour les 7 prochains jours, que cette personne s'est
// authentifiée — sans que le serveur ait à s'en souvenir entre deux
// requêtes (on dit qu'il est "stateless").
app.post('/api/auth/login', loginLimiter, async (req, res) => {
  try {
    const { email, password } = req.body || {};
    // E-mail normalisé (minuscules, sans espaces) AVANT la recherche :
    // les comptes sont enregistrés ainsi (voir utils/email.js), et
    // findUnique est sensible à la casse.
    const normalizedEmail = normalizeEmail(email);
    if (!normalizedEmail || typeof password !== 'string' || !password) {
      return res.status(400).json({ error: 'Email et mot de passe requis.' });
    }

    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });

    // Même message d'erreur que l'email existe ou non : on ne révèle
    // jamais à quelqu'un qui devine des comptes lesquels sont valides.
    if (!user) {
      return res.status(401).json({ error: 'Identifiants invalides.' });
    }

    // Un compte désactivé ne doit plus pouvoir se connecter, même avec
    // le bon mot de passe. Sans ce test, désactiver quelqu'un depuis
    // l'Espace Secrétariat n'aurait aucun effet réel.
    if (!user.isActive) {
      return res.status(401).json({ error: 'Identifiants invalides.' });
    }

    const passwordMatches = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatches) {
      return res.status(401).json({ error: 'Identifiants invalides.' });
    }

    // Le jeton contient l'id et le niveau — jamais le mot de passe.
    // Signé avec JWT_SECRET : impossible à fabriquer ou modifier sans
    // connaître cette clé.
    const token = jwt.sign(
      { userId: user.id, level: user.level },
      process.env.JWT_SECRET,
      { expiresIn: '7d' },
    );

    res.json({
      token,
      user: {
        id: user.id, name: user.name, email: user.email,
        level: user.level, countryId: user.countryId, orgRole: user.orgRole,
      },
    });
  } catch (error) {
    console.error('Erreur POST /api/auth/login :', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// --- "Qui suis-je ?" — permet à React de retrouver la session après
//     un rechargement de page (F5), sans redemander le mot de passe ---
app.get('/api/auth/me', requireAuth, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: { id: true, name: true, email: true, level: true, countryId: true, orgRole: true },
    });
    if (!user) return res.status(404).json({ error: 'Utilisateur introuvable.' });
    res.json({ user });
  } catch (error) {
    console.error('Erreur /api/auth/me :', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ============================================================
// 6. ROUTES ADMIN — Espace Secrétariat
//    Toutes protégées par requireAuth + requireRole.
// ============================================================

// ---------- 6.1 Tableau de bord ----------

app.get('/api/admin/dashboard', requireAuth, requireRole('secretariat_admin'), async (req, res) => {
  try {
    const [countriesCount, usersCount, pendingDocuments] = await Promise.all([
      prisma.country.count(),
      prisma.user.count(),
      prisma.document.count({
        where: { status: { in: ['received_secretariat', 'revision_requested', 'pending_steering'] } },
      }),
    ]);

    res.json({ countriesCount, usersCount, pendingDocuments });
  } catch (error) {
    console.error('Erreur /api/admin/dashboard :', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ---------- 6.2 Comptes des pays ----------

app.get('/api/admin/countries', requireAuth, requireRole('secretariat_admin'), async (req, res) => {
  try {
    const countries = await prisma.country.findMany({
      orderBy: { nameFr: 'asc' },
      include: {
        twgsAsLead: { select: { id: true, nameFr: true, nameEn: true, nameAr: true } },
        twgsAsColead: { select: { id: true, nameFr: true, nameEn: true, nameAr: true } },
        _count: { select: { users: true } },
      },
    });
    res.json(countries);
  } catch (error) {
    console.error('Erreur /api/admin/countries :', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.post('/api/admin/countries', requireAuth, requireRole('secretariat_admin'), async (req, res) => {
  try {
    const { id, nameFr, nameEn, nameAr, nraNameFr, nraNameEn, nraNameAr,
            email, phone, website, orgRole, orgRoleOther } = req.body;

    if (!id || !nameFr || !nameEn || !nameAr) {
      return res.status(400).json({ error: 'Le code pays et les trois noms sont obligatoires.' });
    }

    const existing = await prisma.country.findUnique({ where: { id: id.toLowerCase() } });
    if (existing) {
      return res.status(409).json({ error: `Le code pays "${id}" est déjà utilisé.` });
    }

    const country = await prisma.country.create({
      data: {
        id: id.toLowerCase(),
        nameFr, nameEn, nameAr,
        nraNameFr, nraNameEn, nraNameAr,
        email, phone, website,
        orgRole: orgRole || null,
        orgRoleOther: orgRole === 'other' ? orgRoleOther : null,
      },
    });
    res.status(201).json(country);
  } catch (error) {
    console.error('Erreur POST /api/admin/countries :', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// PUT plutôt que POST : par convention, POST crée une ressource,
// PUT met à jour une ressource existante identifiée par son URL.
app.put('/api/admin/countries/:id', requireAuth, requireRole('secretariat_admin'), async (req, res) => {
  try {
    const { nameFr, nameEn, nameAr, nraNameFr, nraNameEn, nraNameAr,
            email, phone, website, orgRole, orgRoleOther } = req.body;

    const existing = await prisma.country.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: 'Pays introuvable.' });

    const country = await prisma.country.update({
      where: { id: req.params.id },
      data: {
        nameFr, nameEn, nameAr,
        nraNameFr, nraNameEn, nraNameAr,
        email, phone, website,
        orgRole: orgRole || null,
        orgRoleOther: orgRole === 'other' ? orgRoleOther : null,
      },
    });
    res.json(country);
  } catch (error) {
    console.error('Erreur PUT /api/admin/countries/:id :', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ⚠️ GARDES-FOUS MÉTIER : on refuse de supprimer un pays qui dirige
// un GTT (le groupe deviendrait orphelin) ou qui a des utilisateurs
// rattachés (des comptes disparaîtraient silencieusement).
app.delete('/api/admin/countries/:id', requireAuth, requireRole('secretariat_admin'), async (req, res) => {
  try {
    const country = await prisma.country.findUnique({
      where: { id: req.params.id },
      include: {
        twgsAsLead: true,
        twgsAsColead: true,
        _count: { select: { users: true } },
      },
    });

    if (!country) return res.status(404).json({ error: 'Pays introuvable.' });

    if (country.twgsAsLead.length > 0 || country.twgsAsColead.length > 0) {
      return res.status(409).json({
        error: 'Impossible de supprimer ce pays : il est lead ou co-lead d\'un ou plusieurs GTT. Réattribuez ces rôles d\'abord.',
      });
    }

    if (country._count.users > 0) {
      return res.status(409).json({
        error: `Impossible de supprimer ce pays : ${country._count.users} utilisateur(s) y sont rattaché(s).`,
      });
    }

    await prisma.country.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error) {
    console.error('Erreur DELETE /api/admin/countries/:id :', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ---------- 6.3 Gestion des utilisateurs ----------

// Les champs qu'on accepte de renvoyer au client — jamais passwordHash.
const USER_PUBLIC_SELECT = {
  id: true, name: true, email: true, level: true,
  orgRole: true, orgRoleOther: true, isActive: true, countryId: true,
  country: { select: { id: true, nameFr: true, nameEn: true, nameAr: true } },
  userFunctions: { select: { functionCode: true } },
  twgMemberships: {
    select: {
      role: true,
      twg: { select: { id: true, nameFr: true, nameEn: true, nameAr: true } },
    },
  },
};

// Filtre optionnel par pays : /api/admin/users?countryId=dz
app.get('/api/admin/users', requireAuth, requireRole('secretariat_admin'), async (req, res) => {
  try {
    const { countryId } = req.query;
    const users = await prisma.user.findMany({
      where: countryId ? { countryId } : undefined,
      select: USER_PUBLIC_SELECT,
      orderBy: [{ countryId: 'asc' }, { name: 'asc' }],
    });
    res.json(users);
  } catch (error) {
    console.error('Erreur /api/admin/users :', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// La liste des fonctions réglementaires, pour alimenter le formulaire
app.get('/api/admin/functions', requireAuth, requireRole('secretariat_admin'), async (req, res) => {
  try {
    const functions = await prisma.function.findMany({ orderBy: { code: 'asc' } });
    res.json(functions);
  } catch (error) {
    console.error('Erreur /api/admin/functions :', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Validation commune à POST et PUT /api/admin/users (même style que
// validateNewsBody). Le formulaire envoie toujours l'utilisateur complet ;
// conventions du formulaire conservées :
//   - countryId ''  → aucun pays (Secrétariat régional) ;
//   - orgRole ''    → aucun rôle institutionnel ;
//   - password ''   → en modification : mot de passe inchangé ;
//   - functions absent → en modification : fonctions inchangées.
// Les valeurs permises de level et orgRole viennent des enums du schéma
// (importés de @prisma/client) : pas de liste recopiée à maintenir.
// Renvoie { status, error } ou { data, functions, password }.
const USER_LEVELS = Object.values(UserLevel);
const ORG_ROLES = Object.values(OrgRole);
const PASSWORD_MIN_LENGTH = 12;
const PASSWORD_MAX_LENGTH = 72;   // bcrypt ignore tout au-delà de 72 octets

async function validateUserBody(body, { userId = null } = {}) {
  const isCreate = userId === null;
  const bad = (error) => ({ status: 400, error });
  if (!body || typeof body !== 'object' || Array.isArray(body)) return bad('Corps de requête JSON attendu.');

  const { name, email, password, level, countryId, orgRole, orgRoleOther, functions } = body;
  const isOptionalString = (v) => v === undefined || v === null || typeof v === 'string';
  for (const [label, value] of [['nom', name], ['e-mail', email], ['mot de passe', password],
    ['niveau', level], ['pays', countryId], ['rôle institutionnel', orgRole], ['précision du rôle', orgRoleOther]]) {
    if (!isOptionalString(value)) return bad(`Le champ ${label} doit être du texte.`);
  }

  const cleanName = (name || '').trim();
  if (!cleanName) return bad('Le nom est obligatoire.');
  if (cleanName.length > 200) return bad('Le nom dépasse 200 caractères.');

  // Toujours en minuscules, sans espaces (voir utils/email.js) : c'est
  // ainsi que la connexion la recherchera.
  const cleanEmail = normalizeEmail(email);
  if (!cleanEmail) return bad('L\'adresse e-mail est obligatoire.');
  if (!isValidEmail(cleanEmail)) return bad('L\'adresse e-mail est invalide.');

  if (!level) return bad('Le niveau d\'accès est obligatoire.');
  if (!USER_LEVELS.includes(level)) return bad(`Niveau d'accès inconnu. Valeurs permises : ${USER_LEVELS.join(', ')}.`);

  // Mot de passe : obligatoire à la création, facultatif en modification
  // (vide = inchangé), mais s'il est fourni il respecte les mêmes règles.
  const pwd = password || '';
  if (isCreate && !pwd) return bad('Le mot de passe est obligatoire à la création.');
  if (pwd && pwd.length < PASSWORD_MIN_LENGTH) return bad(`Le mot de passe doit faire au moins ${PASSWORD_MIN_LENGTH} caractères.`);
  if (Buffer.byteLength(pwd, 'utf8') > PASSWORD_MAX_LENGTH) return bad(`Le mot de passe ne doit pas dépasser ${PASSWORD_MAX_LENGTH} octets.`);

  const cleanCountry = (countryId || '').trim() || null;
  if (cleanCountry) {
    const country = await prisma.country.findUnique({ where: { id: cleanCountry }, select: { id: true } });
    if (!country) return bad(`Pays inconnu : ${cleanCountry}`);
  }

  const cleanOrgRole = orgRole || null;
  if (cleanOrgRole && !ORG_ROLES.includes(cleanOrgRole)) {
    return bad(`Rôle institutionnel inconnu. Valeurs permises : ${ORG_ROLES.join(', ')}.`);
  }
  const cleanOrgRoleOther = cleanOrgRole === 'other' ? ((orgRoleOther || '').trim() || null) : null;
  if (cleanOrgRoleOther && cleanOrgRoleOther.length > 200) return bad('La précision du rôle dépasse 200 caractères.');

  let cleanFunctions;   // undefined = ne pas toucher (modification uniquement)
  if (functions !== undefined && functions !== null) {
    if (!Array.isArray(functions) || functions.some((c) => typeof c !== 'string')) {
      return bad('Les fonctions doivent être une liste de codes (ex. ["MA", "PV"]).');
    }
    cleanFunctions = [...new Set(functions)];
    if (cleanFunctions.length > 0) {
      const found = await prisma.function.findMany({ where: { code: { in: cleanFunctions } }, select: { code: true } });
      const unknown = cleanFunctions.filter((c) => !found.some((f) => f.code === c));
      if (unknown.length > 0) return bad(`Fonction(s) inconnue(s) : ${unknown.join(', ')}`);
    }
  } else if (isCreate) {
    cleanFunctions = [];
  }

  // Unicité de l'e-mail. cleanEmail est déjà en minuscules, mais la
  // comparaison reste insensible à la casse : elle détecte aussi une
  // adresse en majuscules restée dans une base pas encore normalisée
  // (voir DEPLOY.md). On exclut l'utilisateur modifié lui-même.
  const duplicate = await prisma.user.findFirst({
    where: {
      email: { equals: cleanEmail, mode: 'insensitive' },
      ...(isCreate ? {} : { NOT: { id: userId } }),
    },
    select: { id: true },
  });
  if (duplicate) return { status: 409, error: 'Cette adresse e-mail est déjà utilisée par un autre compte.' };

  return {
    data: {
      name: cleanName, email: cleanEmail, level,
      countryId: cleanCountry, orgRole: cleanOrgRole, orgRoleOther: cleanOrgRoleOther,
    },
    functions: cleanFunctions,
    password: pwd,
  };
}

// Course possible entre la vérification d'unicité et l'écriture : la
// contrainte @unique de la base tranche, on la traduit en 409.
function isUniqueEmailViolation(error) {
  return error && error.code === 'P2002';
}

app.post('/api/admin/users', requireAuth, requireRole('secretariat_admin'), async (req, res) => {
  try {
    const result = await validateUserBody(req.body);
    if (result.error) return res.status(result.status).json({ error: result.error });

    // Le mot de passe n'est JAMAIS stocké en clair : bcrypt le hache
    // de façon irréversible (on ne peut que vérifier, pas relire).
    const passwordHash = await bcrypt.hash(result.password, 10);

    const user = await prisma.user.create({
      data: {
        ...result.data,
        passwordHash,
        userFunctions: {
          create: result.functions.map((code) => ({ functionCode: code })),
        },
      },
      select: USER_PUBLIC_SELECT,
    });

    res.status(201).json(user);
  } catch (error) {
    if (isUniqueEmailViolation(error)) {
      return res.status(409).json({ error: 'Cette adresse e-mail est déjà utilisée par un autre compte.' });
    }
    console.error('Erreur POST /api/admin/users :', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Le mot de passe est optionnel ici : s'il est vide, on n'y touche pas.
app.put('/api/admin/users/:id', requireAuth, requireRole('secretariat_admin'), async (req, res) => {
  try {
    const userId = parseId(req.params.id);
    if (userId === null) return res.status(400).json({ error: INVALID_ID_ERROR });

    const existing = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
    if (!existing) return res.status(404).json({ error: 'Utilisateur introuvable.' });

    const result = await validateUserBody(req.body, { userId });
    if (result.error) return res.status(result.status).json({ error: result.error });

    // Garde-fou, même logique que l'auto-désactivation : un admin ne
    // change pas son PROPRE niveau. Sinon il pourrait se rétrograder par
    // erreur et perdre l'accès à l'Espace Secrétariat (le dernier admin
    // verrouillerait tout le monde dehors). Ses autres champs restent
    // modifiables. req.user.level est le niveau ACTUEL relu en base.
    if (userId === req.user.userId && result.data.level !== req.user.level) {
      return res.status(409).json({ error: 'Vous ne pouvez pas modifier votre propre niveau d\'accès. Demandez à un autre administrateur.' });
    }

    const data = { ...result.data };
    if (result.password) {
      data.passwordHash = await bcrypt.hash(result.password, 10);
    }

    // Fonctions réglementaires : deleteMany puis create DANS le même
    // update = une seule écriture atomique (avant, la suppression avait
    // lieu à part, et un échec de l'update laissait l'utilisateur sans
    // aucune fonction).
    if (result.functions !== undefined) {
      data.userFunctions = {
        deleteMany: {},
        create: result.functions.map((code) => ({ functionCode: code })),
      };
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data,
      select: USER_PUBLIC_SELECT,
    });

    res.json(user);
  } catch (error) {
    if (isUniqueEmailViolation(error)) {
      return res.status(409).json({ error: 'Cette adresse e-mail est déjà utilisée par un autre compte.' });
    }
    console.error('Erreur PUT /api/admin/users/:id :', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ⚠️ On ne SUPPRIME pas un utilisateur, on le DÉSACTIVE : il peut être
// l'auteur de documents que l'historique doit conserver. C'est
// exactement le rôle du champ isActive prévu au schéma v2 [C9].
app.patch('/api/admin/users/:id/active', requireAuth, requireRole('secretariat_admin'), async (req, res) => {
  try {
    const userId = parseId(req.params.id);
    if (userId === null) return res.status(400).json({ error: INVALID_ID_ERROR });
    // Express 5 : req.body vaut undefined si la requête n'a pas de corps JSON.
    const { isActive } = req.body || {};

    // Un booléen strict : sans ce test, un corps vide ou { isActive: "true" }
    // donnait Boolean(undefined) = false… et désactivait le compte.
    if (typeof isActive !== 'boolean') {
      return res.status(400).json({ error: 'Le champ isActive doit valoir true ou false.' });
    }

    // Garde-fou : ne pas se désactiver soi-même et se verrouiller dehors.
    if (userId === req.user.userId && isActive === false) {
      return res.status(409).json({ error: 'Vous ne pouvez pas désactiver votre propre compte.' });
    }

    const existing = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
    if (!existing) return res.status(404).json({ error: 'Utilisateur introuvable.' });

    const user = await prisma.user.update({
      where: { id: userId },
      data: { isActive },
      select: USER_PUBLIC_SELECT,
    });

    res.json(user);
  } catch (error) {
    console.error('Erreur PATCH /api/admin/users/:id/active :', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ---------- 6.4 Circuit documentaire ----------

const DOCUMENT_STATUSES = [
  'draft_twg', 'received_secretariat', 'revision_requested',
  'pending_steering', 'distributed_internal', 'published_public', 'archived',
];

const ADMIN_DOCUMENT_SELECT = {
  id: true, titleFr: true, titleEn: true, titleAr: true,
  category: true, phase: true, status: true, visibility: true, version: true,
  twg: { select: { id: true, nameFr: true, nameEn: true, nameAr: true } },
  createdBy: { select: { id: true, name: true } },
  createdAt: true,
};

// TOUS les documents, quel que soit leur statut — contrairement à la
// route publique /api/documents qui n'en montre qu'une partie filtrée.
app.get('/api/admin/documents', requireAuth, requireRole('secretariat_admin'), async (req, res) => {
  try {
    const documents = await prisma.document.findMany({
      select: ADMIN_DOCUMENT_SELECT,
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    });
    res.json(documents);
  } catch (error) {
    console.error('Erreur /api/admin/documents :', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ⚠️ C'est ici qu'on fait respecter l'invariant de la bibliothèque
// publique. Si on changeait le statut sans ajuster la visibilité, on
// pourrait avoir un document "publié" qui ne sort jamais réellement,
// ou dont le statut et la visibilité se contredisent.
function visibilityForStatus(status) {
  if (status === 'published_public') return 'public';
  return 'internal';   // tous les autres statuts : jamais publics
}

app.patch('/api/admin/documents/:id/status', requireAuth, requireRole('secretariat_admin'), async (req, res) => {
  try {
    const documentId = parseId(req.params.id);
    if (documentId === null) return res.status(400).json({ error: INVALID_ID_ERROR });
    const { status } = req.body;

    if (!DOCUMENT_STATUSES.includes(status)) {
      return res.status(400).json({ error: 'Statut invalide.' });
    }

    const existing = await prisma.document.findUnique({ where: { id: documentId } });
    if (!existing) return res.status(404).json({ error: 'Document introuvable.' });

    const document = await prisma.document.update({
      where: { id: documentId },
      data: {
        status,
        visibility: visibilityForStatus(status),
        validatedByBody: status === 'published_public' ? 'secretariat' : existing.validatedByBody,
        validatedAt: status === 'published_public' ? new Date() : existing.validatedAt,
      },
      select: ADMIN_DOCUMENT_SELECT,
    });

    res.json(document);
  } catch (error) {
    console.error('Erreur PATCH /api/admin/documents/:id/status :', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ---------- 6.5 Gestion du contenu (actualités) ----------

// TOUTES les actualités, publiées ou non (brouillons compris).
app.get('/api/admin/news', requireAuth, requireRole('secretariat_admin'), async (req, res) => {
  try {
    const news = await prisma.news.findMany({ orderBy: { sortDate: 'desc' } });
    res.json(news);
  } catch (error) {
    console.error('Erreur /api/admin/news :', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Validation commune à POST et PUT (le formulaire envoie toujours
// l'actualité complète). Calquée sur PUT /api/admin/twgs/:id : on nettoie
// (trim), on vérifie les types, et on répond 400 avec un message clair
// plutôt que de laisser Prisma échouer en 500.
//
// Selon le schéma (model News), les 9 textes sont NON NULLS :
//   - titres FR/EN/AR : obligatoires et non vides ;
//   - dates affichées ("Sept. 2026") et corps : facultatifs dans le
//     formulaire, donc chaîne vide acceptée — mais ce doit être du texte ;
//   - sortDate : obligatoire, date réelle au format AAAA-MM-JJ (ce que
//     produit <input type="date">), ou ISO complet ;
//   - publishNow : absent, true ou false.
// Renvoie { error } ou { data } (data prêt pour Prisma, sans publishedAt).
const NEWS_TEXT_LIMITS = {
  dateFr: 50, dateEn: 50, dateAr: 50,
  titleFr: 300, titleEn: 300, titleAr: 300,
  bodyFr: 20000, bodyEn: 20000, bodyAr: 20000,
};
const NEWS_LABELS = {
  dateFr: 'date affichée (FR)', dateEn: 'date affichée (EN)', dateAr: 'date affichée (AR)',
  titleFr: 'titre (FR)', titleEn: 'titre (EN)', titleAr: 'titre (AR)',
  bodyFr: 'texte (FR)', bodyEn: 'texte (EN)', bodyAr: 'texte (AR)',
};

function parseSortDate(value) {
  if (typeof value !== 'string') return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})(T[\d:.]+(Z|[+-]\d{2}:\d{2})?)?$/.exec(value.trim());
  if (!match) return null;
  const date = new Date(value.trim());
  if (Number.isNaN(date.getTime())) return null;
  // Rejette les dates qui « débordent » (2026-02-31 → 3 mars) : le jour
  // relu doit être celui qui a été écrit.
  const [, y, m, d] = match.map(Number);
  const check = new Date(Date.UTC(y, m - 1, d));
  if (check.getUTCFullYear() !== y || check.getUTCMonth() !== m - 1 || check.getUTCDate() !== d) return null;
  if (y < 1900 || y > 2100) return null;
  return date;
}

function validateNewsBody(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { error: 'Corps de requête JSON attendu.' };
  }
  const data = {};
  for (const [field, max] of Object.entries(NEWS_TEXT_LIMITS)) {
    const value = body[field];
    if (value !== undefined && value !== null && typeof value !== 'string') {
      return { error: `Le champ ${NEWS_LABELS[field]} doit être du texte.` };
    }
    const text = (value || '').trim();
    if (text.length > max) {
      return { error: `Le champ ${NEWS_LABELS[field]} dépasse ${max} caractères.` };
    }
    data[field] = text;
  }
  if (!data.titleFr || !data.titleEn || !data.titleAr) {
    return { error: 'Les trois titres (FR, EN, AR) sont obligatoires.' };
  }

  if (body.sortDate === undefined || body.sortDate === null || body.sortDate === '') {
    return { error: 'La date de tri est obligatoire.' };
  }
  const sortDate = parseSortDate(body.sortDate);
  if (!sortDate) {
    return { error: 'La date de tri est invalide (format attendu : AAAA-MM-JJ).' };
  }
  data.sortDate = sortDate;

  if (body.publishNow !== undefined && typeof body.publishNow !== 'boolean') {
    return { error: 'Le champ publishNow doit valoir true ou false.' };
  }
  return { data };
}

app.post('/api/admin/news', requireAuth, requireRole('secretariat_admin'), async (req, res) => {
  try {
    const { error, data } = validateNewsBody(req.body);
    if (error) return res.status(400).json({ error });

    const item = await prisma.news.create({
      data: {
        ...data,
        // publishedAt = null signifie brouillon, invisible du public
        // (voir le filtre de la route publique /api/news).
        publishedAt: req.body.publishNow ? new Date() : null,
      },
    });
    res.status(201).json(item);
  } catch (error) {
    console.error('Erreur POST /api/admin/news :', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.put('/api/admin/news/:id', requireAuth, requireRole('secretariat_admin'), async (req, res) => {
  try {
    const newsId = parseId(req.params.id);
    if (newsId === null) return res.status(400).json({ error: INVALID_ID_ERROR });
    const existing = await prisma.news.findUnique({ where: { id: newsId } });
    if (!existing) return res.status(404).json({ error: 'Actualité introuvable.' });

    const { error, data } = validateNewsBody(req.body);
    if (error) return res.status(400).json({ error });
    const { publishNow } = req.body;

    const item = await prisma.news.update({
      where: { id: newsId },
      data: {
        ...data,
        // On ne réinitialise pas la date de publication à chaque simple
        // correction de texte sur une actualité déjà publiée.
        publishedAt: publishNow
          ? (existing.publishedAt || new Date())
          : (publishNow === false ? null : existing.publishedAt),
      },
    });
    res.json(item);
  } catch (error) {
    console.error('Erreur PUT /api/admin/news/:id :', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Contrairement aux pays et aux utilisateurs, une actualité n'est
// référencée par rien d'autre : une vraie suppression ne casse aucun
// historique. Pas de garde-fou nécessaire ici.
app.delete('/api/admin/news/:id', requireAuth, requireRole('secretariat_admin'), async (req, res) => {
  try {
    const newsId = parseId(req.params.id);
    if (newsId === null) return res.status(400).json({ error: INVALID_ID_ERROR });
    const existing = await prisma.news.findUnique({ where: { id: newsId } });
    if (!existing) return res.status(404).json({ error: 'Actualité introuvable.' });

    await prisma.news.delete({ where: { id: newsId } });
    res.json({ success: true });
  } catch (error) {
    console.error('Erreur DELETE /api/admin/news/:id :', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ---------- 6.6 Gestion du contenu (groupes de travail) ----------
//
// Pas de POST ni de DELETE : les cinq GTT sont structurels (leur id est un
// slug utilisé dans les URL et les documents). On n'édite que leur contenu.
// La lecture réutilise les routes publiques GET /api/twgs et /api/countries :
// ces données sont publiques, inutile de les dupliquer côté admin.
app.put('/api/admin/twgs/:id', requireAuth, requireRole('secretariat_admin'), async (req, res) => {
  try {
    const { nameFr, nameEn, nameAr, descFr, descEn, descAr,
            wave, leadCountryId, coleadCountryId } = req.body;

    const existing = await prisma.twg.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: 'Groupe de travail introuvable.' });

    const clean = (v) => (typeof v === 'string' ? v.trim() : '');
    if (!clean(nameFr) || !clean(nameEn) || !clean(nameAr)) {
      return res.status(400).json({ error: 'Les trois noms (FR, EN, AR) sont obligatoires.' });
    }

    const waveNum = Number(wave);
    if (!Number.isInteger(waveNum) || waveNum < 1 || waveNum > 3) {
      return res.status(400).json({ error: 'La vague doit être 1, 2 ou 3.' });
    }

    // Chaîne vide ou absente = "aucun pays" (null en base).
    const lead = clean(leadCountryId) || null;
    const colead = clean(coleadCountryId) || null;
    if (lead && lead === colead) {
      return res.status(400).json({ error: 'Le pays lead et le pays co-lead doivent être différents.' });
    }
    for (const countryId of [lead, colead].filter(Boolean)) {
      const country = await prisma.country.findUnique({ where: { id: countryId } });
      if (!country) return res.status(400).json({ error: `Pays inconnu : ${countryId}` });
    }

    const twg = await prisma.twg.update({
      where: { id: req.params.id },
      data: {
        nameFr: clean(nameFr), nameEn: clean(nameEn), nameAr: clean(nameAr),
        descFr: clean(descFr) || null, descEn: clean(descEn) || null, descAr: clean(descAr) || null,
        wave: waveNum,
        leadCountryId: lead,
        coleadCountryId: colead,
      },
    });
    res.json(twg);
  } catch (error) {
    console.error('Erreur PUT /api/admin/twgs/:id :', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});// ============================================================
// 7. DÉMARRAGE
// ============================================================

app.listen(PORT, () => {
  console.log(`✅ Serveur API démarré sur http://localhost:${PORT}`);
  console.log(`   Santé   : http://localhost:${PORT}/api/health`);
  console.log(`   Publique: http://localhost:${PORT}/api/countries`);
  // UNE ligne récapitulative, volontairement sans aucun secret : ni
  // JWT_SECRET, ni DATABASE_URL (qui contient le mot de passe de la
  // base), ni même la liste des origines — seulement leur nombre.
  console.log(`   Configuration : NODE_ENV=${process.env.NODE_ENV || '(vide)'} | origines CORS=${ALLOWED_ORIGINS.length}`
    + `${configuredOrigins.length === 0 ? ' (défaut local)' : ''} | trust proxy=${TRUST_PROXY}`
    + ` | limitation de débit=${RATE_LIMIT_DISABLED ? 'DÉSACTIVÉE (RATE_LIMIT_DISABLED=1, hors production)' : 'active'}`);
});