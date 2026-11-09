-- CreateEnum
CREATE TYPE "OrgRole" AS ENUM ('president', 'vice_president', 'member', 'secretariat', 'other');

-- CreateEnum
CREATE TYPE "UserLevel" AS ENUM ('lecteur', 'contributeur', 'validateur', 'admin_pays');

-- CreateEnum
CREATE TYPE "DocumentCategory" AS ENUM ('guideline', 'sop', 'report', 'template');

-- CreateEnum
CREATE TYPE "DocumentVisibility" AS ENUM ('public', 'internal', 'confidential');

-- CreateEnum
CREATE TYPE "DocumentStatus" AS ENUM ('draft_twg', 'received_secretariat', 'revision_requested', 'pending_steering', 'distributed_internal', 'published_public', 'archived');

-- CreateEnum
CREATE TYPE "ComplaintNature" AS ENUM ('service', 'delay', 'access', 'other');

-- CreateEnum
CREATE TYPE "ComplaintStatus" AS ENUM ('new', 'in_progress', 'resolved');

-- CreateTable
CREATE TABLE "countries" (
    "id" TEXT NOT NULL,
    "nameFr" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameAr" TEXT NOT NULL,
    "nraNameFr" TEXT,
    "nraNameEn" TEXT,
    "nraNameAr" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "website" TEXT,
    "orgRole" "OrgRole",
    "orgRoleOther" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "countries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "functions" (
    "code" TEXT NOT NULL,
    "labelFr" TEXT NOT NULL,
    "labelEn" TEXT NOT NULL,
    "labelAr" TEXT NOT NULL,

    CONSTRAINT "functions_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "twgs" (
    "id" SERIAL NOT NULL,
    "nameFr" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameAr" TEXT NOT NULL,
    "descFr" TEXT,
    "descEn" TEXT,
    "descAr" TEXT,
    "wave" INTEGER NOT NULL,
    "leadCountryId" TEXT,
    "coleadCountryId" TEXT,

    CONSTRAINT "twgs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "countryId" TEXT,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "level" "UserLevel" NOT NULL,
    "orgRole" "OrgRole",
    "orgRoleOther" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_functions" (
    "userId" INTEGER NOT NULL,
    "functionCode" TEXT NOT NULL,

    CONSTRAINT "user_functions_pkey" PRIMARY KEY ("userId","functionCode")
);

-- CreateTable
CREATE TABLE "documents" (
    "id" SERIAL NOT NULL,
    "twgId" INTEGER NOT NULL,
    "titleFr" TEXT NOT NULL,
    "titleEn" TEXT NOT NULL,
    "titleAr" TEXT NOT NULL,
    "category" "DocumentCategory" NOT NULL,
    "phase" INTEGER NOT NULL,
    "visibility" "DocumentVisibility" NOT NULL,
    "status" "DocumentStatus" NOT NULL DEFAULT 'draft_twg',
    "version" TEXT NOT NULL DEFAULT '1.0',
    "validatedById" INTEGER,
    "validatedAt" TIMESTAMP(3),
    "createdById" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "news" (
    "id" SERIAL NOT NULL,
    "date" TEXT NOT NULL,
    "titleFr" TEXT NOT NULL,
    "titleEn" TEXT NOT NULL,
    "titleAr" TEXT NOT NULL,
    "bodyFr" TEXT NOT NULL,
    "bodyEn" TEXT NOT NULL,
    "bodyAr" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3),

    CONSTRAINT "news_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "complaints" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "org" TEXT,
    "countryId" TEXT,
    "nature" "ComplaintNature" NOT NULL,
    "message" TEXT NOT NULL,
    "status" "ComplaintStatus" NOT NULL DEFAULT 'new',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "complaints_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "twgs_leadCountryId_idx" ON "twgs"("leadCountryId");

-- CreateIndex
CREATE INDEX "twgs_coleadCountryId_idx" ON "twgs"("coleadCountryId");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_countryId_idx" ON "users"("countryId");

-- CreateIndex
CREATE INDEX "user_functions_functionCode_idx" ON "user_functions"("functionCode");

-- CreateIndex
CREATE INDEX "documents_twgId_idx" ON "documents"("twgId");

-- CreateIndex
CREATE INDEX "documents_createdById_idx" ON "documents"("createdById");

-- CreateIndex
CREATE INDEX "documents_validatedById_idx" ON "documents"("validatedById");

-- CreateIndex
CREATE INDEX "complaints_countryId_idx" ON "complaints"("countryId");

-- AddForeignKey
ALTER TABLE "twgs" ADD CONSTRAINT "twgs_leadCountryId_fkey" FOREIGN KEY ("leadCountryId") REFERENCES "countries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "twgs" ADD CONSTRAINT "twgs_coleadCountryId_fkey" FOREIGN KEY ("coleadCountryId") REFERENCES "countries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "countries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_functions" ADD CONSTRAINT "user_functions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_functions" ADD CONSTRAINT "user_functions_functionCode_fkey" FOREIGN KEY ("functionCode") REFERENCES "functions"("code") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_twgId_fkey" FOREIGN KEY ("twgId") REFERENCES "twgs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_validatedById_fkey" FOREIGN KEY ("validatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "complaints" ADD CONSTRAINT "complaints_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "countries"("id") ON DELETE SET NULL ON UPDATE CASCADE;
