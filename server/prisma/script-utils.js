// ============================================================
// server/prisma/script-utils.js
// Outils communs aux scripts lancés à la main : seed-reference.js,
// seed-demo.js et scripts/create-admin.js.
// ============================================================

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');

// Arrête le script avec un message clair (code de sortie 1).
function fail(message) {
  console.error(`❌ ${message}`);
  process.exit(1);
}

// DATABASE_URL contient le mot de passe de la base : on ne l'affiche
// JAMAIS. Seuls l'hôte, le port et le nom de la base sortent d'ici.
function parseDatabaseUrl() {
  const raw = process.env.DATABASE_URL;
  if (!raw) fail('DATABASE_URL est absente (voir server/.env.example).');
  try {
    const url = new URL(raw);
    return {
      host: url.hostname,
      label: `${url.hostname}${url.port ? `:${url.port}` : ''}${url.pathname}`,
    };
  } catch {
    fail('DATABASE_URL n\'est pas une URL valide (son contenu n\'est pas affiché : il contient un mot de passe).');
  }
}

// Base locale = sur ce poste. Sert de garde-fou au seed de démonstration.
const LOCAL_HOSTS = ['localhost', '127.0.0.1', '::1', '[::1]'];
function isLocalHost(host) {
  return LOCAL_HOSTS.includes(host);
}

function createPrisma() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  return new PrismaClient({ adapter });
}

module.exports = { fail, parseDatabaseUrl, isLocalHost, createPrisma };
