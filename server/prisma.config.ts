import "dotenv/config";
import { defineConfig } from "prisma/config";

// Pourquoi process.env.DATABASE_URL et non env("DATABASE_URL") :
// le helper env() de Prisma LÈVE UNE ERREUR dès que la variable est
// absente, au chargement de ce fichier, donc pour TOUTES les commandes.
// Or `prisma generate` (lancé par `npm install` via postinstall) n'a pas
// besoin de la base : sur un hébergeur, ou dans un clone neuf sans .env,
// l'installation échouait pour rien.
// Avec process.env, generate fonctionne sans DATABASE_URL ; les
// commandes qui touchent vraiment la base (migrate deploy, seed…)
// échouent toujours, avec un message clair, si elle manque.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env.DATABASE_URL,
  },
});
