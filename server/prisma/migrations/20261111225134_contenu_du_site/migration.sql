-- CreateTable
CREATE TABLE "site_content" (
    "key" TEXT NOT NULL,
    "valueFr" TEXT,
    "valueEn" TEXT,
    "valueAr" TEXT,
    "value" TEXT,
    "updatedById" INTEGER,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "site_content_pkey" PRIMARY KEY ("key")
);

-- AddForeignKey
ALTER TABLE "site_content" ADD CONSTRAINT "site_content_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
