-- CreateEnum
CREATE TYPE "StaffRole" AS ENUM ('APARTMENT_ADMIN', 'ADMIN_STAFF', 'CARETAKER');

-- CreateEnum
CREATE TYPE "Plan" AS ENUM ('BASIC', 'STANDARD', 'PREMIUM');

-- CreateTable
CREATE TABLE "clients" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "dbName" TEXT NOT NULL,
    "s3Prefix" TEXT NOT NULL,
    "adminEmail" TEXT NOT NULL,
    "adminPhone" TEXT NOT NULL,
    "caretakerEmail" TEXT,
    "subAdminEmail" TEXT,
    "plan" "Plan" NOT NULL DEFAULT 'BASIC',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "provisionedAt" TIMESTAMP(3),
    "createdByMobile" BOOLEAN NOT NULL DEFAULT false,
    "createdByUserId" TEXT,
    "photoUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "staff_accounts" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT,
    "clientId" TEXT NOT NULL,
    "role" "StaffRole" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "inviteToken" TEXT,
    "inviteExpiry" TIMESTAMP(3),
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "staff_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "clients_slug_key" ON "clients"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "clients_s3Prefix_key" ON "clients"("s3Prefix");

-- CreateIndex
CREATE UNIQUE INDEX "clients_adminEmail_key" ON "clients"("adminEmail");

-- CreateIndex
CREATE UNIQUE INDEX "clients_adminPhone_key" ON "clients"("adminPhone");

-- CreateIndex
CREATE UNIQUE INDEX "clients_caretakerEmail_key" ON "clients"("caretakerEmail");

-- CreateIndex
CREATE UNIQUE INDEX "clients_subAdminEmail_key" ON "clients"("subAdminEmail");

-- CreateIndex
CREATE INDEX "clients_createdAt_idx" ON "clients"("createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "staff_accounts_email_key" ON "staff_accounts"("email");

-- CreateIndex
CREATE UNIQUE INDEX "staff_accounts_inviteToken_key" ON "staff_accounts"("inviteToken");

-- CreateIndex
CREATE INDEX "staff_accounts_clientId_idx" ON "staff_accounts"("clientId");

-- AddForeignKey
ALTER TABLE "staff_accounts" ADD CONSTRAINT "staff_accounts_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

