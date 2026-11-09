/*
  Warnings:

  - The values [new] on the enum `ComplaintStatus` will be removed. If these variants are still used in the database, this will fail.
  - The values [lecteur,contributeur,validateur,admin_pays] on the enum `UserLevel` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `date` on the `news` table. All the data in the column will be lost.
  - The primary key for the `twgs` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - Added the required column `updatedAt` to the `complaints` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `countries` table without a default value. This is not possible if the table is not empty.
  - Added the required column `dateAr` to the `news` table without a default value. This is not possible if the table is not empty.
  - Added the required column `dateEn` to the `news` table without a default value. This is not possible if the table is not empty.
  - Added the required column `dateFr` to the `news` table without a default value. This is not possible if the table is not empty.
  - Added the required column `sortDate` to the `news` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `news` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `twgs` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `users` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "Lang" AS ENUM ('fr', 'en', 'ar');

-- CreateEnum
CREATE TYPE "TwgRole" AS ENUM ('lead', 'colead', 'member');

-- CreateEnum
CREATE TYPE "ValidatingBody" AS ENUM ('secretariat', 'steering_committee');

-- CreateEnum
CREATE TYPE "DocumentEventType" AS ENUM ('created', 'version_submitted', 'forwarded_to_secretariat', 'revision_requested', 'validated', 'distributed_internal', 'published_public', 'archived', 'visibility_changed', 'commented');

-- AlterEnum
BEGIN;
CREATE TYPE "ComplaintStatus_new" AS ENUM ('received', 'in_progress', 'resolved');
ALTER TABLE "public"."complaints" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "complaints" ALTER COLUMN "status" TYPE "ComplaintStatus_new" USING ("status"::text::"ComplaintStatus_new");
ALTER TYPE "ComplaintStatus" RENAME TO "ComplaintStatus_old";
ALTER TYPE "ComplaintStatus_new" RENAME TO "ComplaintStatus";
DROP TYPE "public"."ComplaintStatus_old";
ALTER TABLE "complaints" ALTER COLUMN "status" SET DEFAULT 'received';
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "UserLevel_new" AS ENUM ('reader', 'contributor', 'validator', 'country_admin', 'secretariat_admin');
ALTER TABLE "users" ALTER COLUMN "level" TYPE "UserLevel_new" USING ("level"::text::"UserLevel_new");
ALTER TYPE "UserLevel" RENAME TO "UserLevel_old";
ALTER TYPE "UserLevel_new" RENAME TO "UserLevel";
DROP TYPE "public"."UserLevel_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "documents" DROP CONSTRAINT "documents_twgId_fkey";

-- AlterTable
ALTER TABLE "complaints" ADD COLUMN     "email" TEXT,
ADD COLUMN     "handledById" INTEGER,
ADD COLUMN     "respondedAt" TIMESTAMP(3),
ADD COLUMN     "response" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "status" SET DEFAULT 'received';

-- AlterTable
ALTER TABLE "countries" ADD COLUMN     "addressAr" TEXT,
ADD COLUMN     "addressEn" TEXT,
ADD COLUMN     "addressFr" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "documents" ADD COLUMN     "fileName" TEXT,
ADD COLUMN     "filePath" TEXT,
ADD COLUMN     "mimeType" TEXT,
ADD COLUMN     "sizeBytes" INTEGER,
ADD COLUMN     "validatedByBody" "ValidatingBody",
ALTER COLUMN "twgId" SET DATA TYPE TEXT,
ALTER COLUMN "visibility" SET DEFAULT 'internal';

-- AlterTable
ALTER TABLE "news" DROP COLUMN "date",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "dateAr" TEXT NOT NULL,
ADD COLUMN     "dateEn" TEXT NOT NULL,
ADD COLUMN     "dateFr" TEXT NOT NULL,
ADD COLUMN     "sortDate" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "twgs" DROP CONSTRAINT "twgs_pkey",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "functionCode" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "twgs_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "twgs_id_seq";

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "lastLoginAt" TIMESTAMP(3),
ADD COLUMN     "preferredLang" "Lang" NOT NULL DEFAULT 'fr',
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- CreateTable
CREATE TABLE "twg_members" (
    "userId" INTEGER NOT NULL,
    "twgId" TEXT NOT NULL,
    "role" "TwgRole" NOT NULL DEFAULT 'member',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "twg_members_pkey" PRIMARY KEY ("userId","twgId")
);

-- CreateTable
CREATE TABLE "document_versions" (
    "id" SERIAL NOT NULL,
    "documentId" INTEGER NOT NULL,
    "version" TEXT NOT NULL,
    "fileName" TEXT,
    "filePath" TEXT,
    "mimeType" TEXT,
    "sizeBytes" INTEGER,
    "note" TEXT,
    "createdById" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_comments" (
    "id" SERIAL NOT NULL,
    "documentId" INTEGER NOT NULL,
    "authorId" INTEGER NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_events" (
    "id" SERIAL NOT NULL,
    "documentId" INTEGER NOT NULL,
    "type" "DocumentEventType" NOT NULL,
    "actorId" INTEGER,
    "actorBody" "ValidatingBody",
    "actorLabel" TEXT,
    "fromStatus" "DocumentStatus",
    "toStatus" "DocumentStatus",
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "twg_members_twgId_idx" ON "twg_members"("twgId");

-- CreateIndex
CREATE INDEX "twg_members_role_idx" ON "twg_members"("role");

-- CreateIndex
CREATE INDEX "document_versions_documentId_idx" ON "document_versions"("documentId");

-- CreateIndex
CREATE INDEX "document_versions_createdById_idx" ON "document_versions"("createdById");

-- CreateIndex
CREATE UNIQUE INDEX "document_versions_documentId_version_key" ON "document_versions"("documentId", "version");

-- CreateIndex
CREATE INDEX "document_comments_documentId_idx" ON "document_comments"("documentId");

-- CreateIndex
CREATE INDEX "document_comments_authorId_idx" ON "document_comments"("authorId");

-- CreateIndex
CREATE INDEX "document_events_documentId_idx" ON "document_events"("documentId");

-- CreateIndex
CREATE INDEX "document_events_actorId_idx" ON "document_events"("actorId");

-- CreateIndex
CREATE INDEX "document_events_type_idx" ON "document_events"("type");

-- CreateIndex
CREATE INDEX "document_events_createdAt_idx" ON "document_events"("createdAt");

-- CreateIndex
CREATE INDEX "complaints_handledById_idx" ON "complaints"("handledById");

-- CreateIndex
CREATE INDEX "complaints_status_idx" ON "complaints"("status");

-- CreateIndex
CREATE INDEX "documents_status_idx" ON "documents"("status");

-- CreateIndex
CREATE INDEX "documents_visibility_idx" ON "documents"("visibility");

-- CreateIndex
CREATE INDEX "documents_category_idx" ON "documents"("category");

-- CreateIndex
CREATE INDEX "documents_status_visibility_idx" ON "documents"("status", "visibility");

-- CreateIndex
CREATE INDEX "news_publishedAt_idx" ON "news"("publishedAt");

-- CreateIndex
CREATE INDEX "news_sortDate_idx" ON "news"("sortDate");

-- CreateIndex
CREATE INDEX "twgs_functionCode_idx" ON "twgs"("functionCode");

-- CreateIndex
CREATE INDEX "twgs_wave_idx" ON "twgs"("wave");

-- CreateIndex
CREATE INDEX "users_level_idx" ON "users"("level");

-- CreateIndex
CREATE INDEX "users_isActive_idx" ON "users"("isActive");

-- AddForeignKey
ALTER TABLE "twgs" ADD CONSTRAINT "twgs_functionCode_fkey" FOREIGN KEY ("functionCode") REFERENCES "functions"("code") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "twg_members" ADD CONSTRAINT "twg_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "twg_members" ADD CONSTRAINT "twg_members_twgId_fkey" FOREIGN KEY ("twgId") REFERENCES "twgs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_twgId_fkey" FOREIGN KEY ("twgId") REFERENCES "twgs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_versions" ADD CONSTRAINT "document_versions_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_versions" ADD CONSTRAINT "document_versions_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_comments" ADD CONSTRAINT "document_comments_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_comments" ADD CONSTRAINT "document_comments_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_events" ADD CONSTRAINT "document_events_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_events" ADD CONSTRAINT "document_events_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "complaints" ADD CONSTRAINT "complaints_handledById_fkey" FOREIGN KEY ("handledById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
