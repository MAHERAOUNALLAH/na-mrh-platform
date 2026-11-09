// ============================================================
// NA-MRH — server/scripts/create-admin.js
// Crée le PREMIER administrateur réel du Secrétariat (secretariat_admin,
// compte actif), sur une base qui n'a reçu que seed-reference.js.
// Les comptes suivants se créent ensuite depuis l'Espace Secrétariat.
//
// Usage :
//   node scripts/create-admin.js --name "Prénom Nom" --email adresse@domaine.org [--country tn]
//   (ou : npm run create-admin -- --name "…" --email … [--country …])
//
//   --country : code d'un pays existant (dz, eg, ly, ma, mr, tn).
//               Omis = Secrétariat régional, sans pays de rattachement.
//
// LE MOT DE PASSE N'EST JAMAIS PASSÉ EN ARGUMENT (il resterait dans
// l'historique du shell et dans la liste des processus). Deux façons :
//   1. Saisie masquée : lancer sans ADMIN_PASSWORD, depuis un vrai
//      terminal ; le mot de passe est demandé deux fois, sans écho.
//   2. Variable d'environnement ADMIN_PASSWORD, renseignée SANS que la
//      valeur apparaisse dans une ligne de commande :
//        bash       : read -rs ADMIN_PASSWORD && export ADMIN_PASSWORD
//        PowerShell : $env:ADMIN_PASSWORD = [Runtime.InteropServices.Marshal]::PtrToStringBSTR(
//                       [Runtime.InteropServices.Marshal]::SecureStringToBSTR((Read-Host -AsSecureString 'Mot de passe')))
//        hébergeur  : variable déclarée dans son interface, le temps de la commande.
//      Puis l'effacer : unset ADMIN_PASSWORD / Remove-Item Env:ADMIN_PASSWORD
//
// Le script n'affiche jamais le mot de passe, ni DATABASE_URL.
// L'e-mail est enregistré en minuscules (« Admin.Reel@… » → « admin.reel@… »),
// comme partout ailleurs : la connexion fonctionne quelle que soit la
// casse tapée. Il refuse si l'e-mail existe déjà (quelle que soit la casse).
// ============================================================

const bcrypt = require('bcryptjs');
const { fail, parseDatabaseUrl, createPrisma } = require('../prisma/script-utils');
const { normalizeEmail, isValidEmail } = require('../utils/email');

// Mêmes règles que l'API (validateUserBody dans index.js) et même coût
// bcrypt que les autres comptes. L'e-mail est enregistré en minuscules
// (utils/email.js) : c'est ainsi que la connexion le recherche.
const PASSWORD_MIN_LENGTH = 12;
const PASSWORD_MAX_BYTES = 72;   // bcrypt ignore tout au-delà de 72 octets
const BCRYPT_COST = 10;

// ---------- Arguments : --name, --email, --country ----------
function parseArgs(argv) {
  const known = ['name', 'email', 'country'];
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const match = /^--([a-z]+)(?:=(.*))?$/.exec(argv[i]);
    if (!match) fail(`Argument inattendu : "${argv[i]}". Usage : --name "…" --email … [--country …]`);
    const [, key, inline] = match;
    if (key === 'password') {
      fail('Le mot de passe ne se passe JAMAIS en argument (il resterait dans l\'historique du shell). '
        + 'Utilisez ADMIN_PASSWORD ou la saisie masquée (voir l\'en-tête du script).');
    }
    if (!known.includes(key)) fail(`Option inconnue : --${key}. Options : --name, --email, --country.`);
    const value = inline !== undefined ? inline : argv[i + 1];
    if (inline === undefined) i += 1;
    if (value === undefined || value.startsWith('--')) fail(`Valeur manquante pour --${key}.`);
    args[key] = value.trim();
  }
  return args;
}

// ---------- Saisie masquée (aucun caractère affiché) ----------
function promptHidden(question) {
  return new Promise((resolve) => {
    const { stdin, stdout } = process;
    stdout.write(question);
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');
    let value = '';
    const onData = (chunk) => {
      for (const ch of chunk) {
        if (ch === '\r' || ch === '\n') {
          stdin.setRawMode(false); stdin.pause(); stdin.removeListener('data', onData);
          stdout.write('\n');
          resolve(value);
          return;
        }
        if (ch === '\u0003') { stdout.write('\n'); process.exit(130); }        // Ctrl+C
        if (ch === '\u007f' || ch === '\b') { value = value.slice(0, -1); continue; }  // retour arrière
        value += ch;
      }
    };
    stdin.on('data', onData);
  });
}

async function readPassword() {
  if (process.env.ADMIN_PASSWORD !== undefined) return process.env.ADMIN_PASSWORD;
  if (!process.stdin.isTTY) {
    fail('Aucun terminal interactif pour la saisie masquée, et ADMIN_PASSWORD est absente. '
      + 'Renseignez ADMIN_PASSWORD sans l\'écrire dans la commande (voir l\'en-tête du script).');
  }
  const first = await promptHidden('Mot de passe (12 caractères minimum, non affiché) : ');
  const second = await promptHidden('Confirmez le mot de passe : ');
  if (first !== second) fail('Les deux saisies ne correspondent pas. Aucun compte créé.');
  return first;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const name = args.name || '';
  const email = normalizeEmail(args.email);   // minuscules, sans espaces
  const countryId = args.country || null;

  if (!name) fail('Le nom est obligatoire : --name "Prénom Nom".');
  if (name.length > 200) fail('Le nom dépasse 200 caractères.');
  if (!email) fail('L\'e-mail est obligatoire : --email adresse@domaine.org.');
  if (!isValidEmail(email)) fail(`Adresse e-mail invalide : "${args.email}".`);

  const target = parseDatabaseUrl();
  const prisma = createPrisma();
  try {
    console.log(`Base : ${target.label}`);

    if (countryId) {
      const country = await prisma.country.findUnique({ where: { id: countryId }, select: { id: true } });
      if (!country) {
        const ids = (await prisma.country.findMany({ select: { id: true }, orderBy: { id: 'asc' } })).map((c) => c.id);
        fail(`Pays inconnu : "${countryId}". Pays en base : ${ids.join(', ') || '(aucun — lancez d\'abord seed-reference)'}.`);
      }
    }

    // Vérifié AVANT de demander le mot de passe : inutile de le saisir
    // pour se faire refuser ensuite.
    const duplicate = await prisma.user.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } },
      select: { id: true },
    });
    if (duplicate) fail(`Un compte existe déjà avec l'adresse ${email}. Aucun compte créé.`);

    const password = await readPassword();
    if (password.length < PASSWORD_MIN_LENGTH) fail(`Le mot de passe doit faire au moins ${PASSWORD_MIN_LENGTH} caractères. Aucun compte créé.`);
    if (Buffer.byteLength(password, 'utf8') > PASSWORD_MAX_BYTES) fail(`Le mot de passe ne doit pas dépasser ${PASSWORD_MAX_BYTES} octets. Aucun compte créé.`);

    const passwordHash = await bcrypt.hash(password, BCRYPT_COST);
    const user = await prisma.user.create({
      data: {
        name, email, passwordHash, countryId,
        level: 'secretariat_admin',
        isActive: true,
      },
      select: { id: true, name: true, email: true, level: true, isActive: true, countryId: true },
    });

    console.log(`✅ Administrateur créé : #${user.id} ${user.name} <${user.email}> — niveau ${user.level}, `
      + `${user.isActive ? 'actif' : 'INACTIF'}, pays ${user.countryId || '(Secrétariat régional)'}.`);
    console.log('   Pensez à effacer ADMIN_PASSWORD de votre session si vous l\'avez utilisée.');
  } catch (error) {
    if (error && error.code === 'P2002') fail(`Un compte existe déjà avec l'adresse ${email}. Aucun compte créé.`);
    fail(`Erreur pendant la création : ${error.message}`);
  } finally {
    await prisma.$disconnect();
  }
}

main();
