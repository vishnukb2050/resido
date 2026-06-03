-- CreateEnum
CREATE TYPE "ProfileVisibility" AS ENUM ('GLOBAL', 'CONTACTS', 'COMMUNITY', 'FOLLOWERS');

-- CreateEnum
CREATE TYPE "VisibilityType" AS ENUM ('COMMUNITY', 'GROUPS', 'CONTACTS', 'PUBLIC', 'FOLLOWERS');

-- CreateEnum
CREATE TYPE "ServiceAreaType" AS ENUM ('PINCODE', 'DISTRICT', 'STATE', 'PAN_INDIA', 'GLOBAL');

-- CreateEnum
CREATE TYPE "ShareTarget" AS ENUM ('COMMUNITY', 'GROUP', 'CONTACT');

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('SUPER_ADMIN', 'APARTMENT_ADMIN', 'RESIDENT', 'CLEANING_STAFF', 'CARETAKER', 'SECURITY_STAFF', 'ACCOUNTS_STAFF', 'MAINTENANCE_STAFF', 'ADMIN_STAFF', 'STAFF', 'SERVICE_STAFF', 'MANAGER_STAFF', 'MEMBER');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "name" TEXT,
    "age" INTEGER,
    "description" TEXT,
    "profilePhoto" TEXT,
    "profilePhotoThumb" TEXT,
    "role" "Role" NOT NULL DEFAULT 'RESIDENT',
    "profileName" TEXT,
    "phoneVisibility" "VisibilityType" NOT NULL DEFAULT 'COMMUNITY',
    "profileVisibility" "ProfileVisibility" NOT NULL DEFAULT 'GLOBAL',
    "linkBusinessProfile" BOOLEAN NOT NULL DEFAULT false,
    "instagram" TEXT,
    "linkedin" TEXT,
    "website" TEXT,
    "location" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "follow_requests" (
    "id" TEXT NOT NULL,
    "requesterId" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "follow_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "personal_incomes" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "description" TEXT,
    "receiptUrl" TEXT,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "personal_incomes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "personal_expenses" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "category" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paymentMethod" TEXT NOT NULL,
    "description" TEXT,
    "billUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "personal_expenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_profiles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "subCategory" TEXT,
    "description" TEXT NOT NULL,
    "pincode" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "district" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "expertise" TEXT NOT NULL,
    "images" TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "businessName" TEXT,
    "businessType" TEXT,
    "experience" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "website" TEXT,
    "instagram" TEXT,
    "linkedin" TEXT,
    "workingHours" JSONB,
    "services" JSONB,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "serviceAreaType" "ServiceAreaType" NOT NULL DEFAULT 'PINCODE',
    "serviceAreaValues" TEXT[],
    "serviceRadiusKm" INTEGER DEFAULT 10,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "job_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workspace_memberships" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "tenantName" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "memberId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "photoUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workspace_memberships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "otp_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "otp" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "otp_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "note_folders" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "note_folders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "note_pages" (
    "id" TEXT NOT NULL,
    "folderId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "color" TEXT DEFAULT '#ffffff',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "note_pages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "note_shares" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "folderId" TEXT,
    "pageId" TEXT,
    "targetType" "ShareTarget" NOT NULL,
    "targetId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "note_shares_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "saved_scans" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "data" TEXT NOT NULL,
    "type" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "saved_scans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "follows" (
    "id" TEXT NOT NULL,
    "followerId" TEXT NOT NULL,
    "followingId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "follows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_folders" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT DEFAULT '#6366f1',
    "icon" TEXT DEFAULT 'folder',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "document_folders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_files" (
    "id" TEXT NOT NULL,
    "folderId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "title" TEXT,
    "description" TEXT,
    "url" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "size" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "document_files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_shares" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "folderId" TEXT,
    "fileId" TEXT,
    "targetType" "ShareTarget" NOT NULL,
    "targetId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_shares_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_profileName_key" ON "users"("profileName");

-- CreateIndex
CREATE INDEX "users_isActive_linkBusinessProfile_idx" ON "users"("isActive", "linkBusinessProfile");

-- CreateIndex
CREATE INDEX "follow_requests_targetId_idx" ON "follow_requests"("targetId");

-- CreateIndex
CREATE INDEX "follow_requests_targetId_createdAt_idx" ON "follow_requests"("targetId", "createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "follow_requests_requesterId_targetId_key" ON "follow_requests"("requesterId", "targetId");

-- CreateIndex
CREATE INDEX "personal_incomes_userId_date_idx" ON "personal_incomes"("userId", "date" DESC);

-- CreateIndex
CREATE INDEX "personal_expenses_userId_date_idx" ON "personal_expenses"("userId", "date" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "job_profiles_userId_key" ON "job_profiles"("userId");

-- CreateIndex
CREATE INDEX "job_profiles_category_idx" ON "job_profiles"("category");

-- CreateIndex
CREATE INDEX "job_profiles_subCategory_idx" ON "job_profiles"("subCategory");

-- CreateIndex
CREATE INDEX "job_profiles_pincode_idx" ON "job_profiles"("pincode");

-- CreateIndex
CREATE INDEX "job_profiles_district_idx" ON "job_profiles"("district");

-- CreateIndex
CREATE INDEX "job_profiles_state_idx" ON "job_profiles"("state");

-- CreateIndex
CREATE INDEX "job_profiles_businessName_idx" ON "job_profiles"("businessName");

-- CreateIndex
CREATE INDEX "job_profiles_isActive_category_idx" ON "job_profiles"("isActive", "category");

-- CreateIndex
CREATE INDEX "workspace_memberships_userId_tenantId_idx" ON "workspace_memberships"("userId", "tenantId");

-- CreateIndex
CREATE INDEX "workspace_memberships_userId_isActive_idx" ON "workspace_memberships"("userId", "isActive");

-- CreateIndex
CREATE INDEX "workspace_memberships_tenantId_idx" ON "workspace_memberships"("tenantId");

-- CreateIndex
CREATE INDEX "workspace_memberships_tenantId_role_idx" ON "workspace_memberships"("tenantId", "role");

-- CreateIndex
CREATE UNIQUE INDEX "workspace_memberships_userId_tenantId_role_key" ON "workspace_memberships"("userId", "tenantId", "role");

-- CreateIndex
CREATE INDEX "note_folders_userId_updatedAt_idx" ON "note_folders"("userId", "updatedAt" DESC);

-- CreateIndex
CREATE INDEX "note_shares_targetType_targetId_createdAt_idx" ON "note_shares"("targetType", "targetId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "note_shares_folderId_targetType_targetId_idx" ON "note_shares"("folderId", "targetType", "targetId");

-- CreateIndex
CREATE INDEX "note_shares_pageId_targetType_targetId_idx" ON "note_shares"("pageId", "targetType", "targetId");

-- CreateIndex
CREATE INDEX "saved_scans_userId_createdAt_idx" ON "saved_scans"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "follows_followingId_createdAt_idx" ON "follows"("followingId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "follows_followerId_createdAt_idx" ON "follows"("followerId", "createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "follows_followerId_followingId_key" ON "follows"("followerId", "followingId");

-- CreateIndex
CREATE INDEX "document_folders_userId_updatedAt_idx" ON "document_folders"("userId", "updatedAt" DESC);

-- CreateIndex
CREATE INDEX "document_shares_targetType_targetId_createdAt_idx" ON "document_shares"("targetType", "targetId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "document_shares_folderId_targetType_targetId_idx" ON "document_shares"("folderId", "targetType", "targetId");

-- CreateIndex
CREATE INDEX "document_shares_fileId_targetType_targetId_idx" ON "document_shares"("fileId", "targetType", "targetId");

-- AddForeignKey
ALTER TABLE "follow_requests" ADD CONSTRAINT "follow_requests_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "follow_requests" ADD CONSTRAINT "follow_requests_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "personal_incomes" ADD CONSTRAINT "personal_incomes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "personal_expenses" ADD CONSTRAINT "personal_expenses_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_profiles" ADD CONSTRAINT "job_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_memberships" ADD CONSTRAINT "workspace_memberships_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "otp_logs" ADD CONSTRAINT "otp_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "note_folders" ADD CONSTRAINT "note_folders_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "note_pages" ADD CONSTRAINT "note_pages_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "note_folders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "note_shares" ADD CONSTRAINT "note_shares_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "note_folders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "note_shares" ADD CONSTRAINT "note_shares_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "note_pages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "note_shares" ADD CONSTRAINT "note_shares_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_scans" ADD CONSTRAINT "saved_scans_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "follows" ADD CONSTRAINT "follows_followerId_fkey" FOREIGN KEY ("followerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "follows" ADD CONSTRAINT "follows_followingId_fkey" FOREIGN KEY ("followingId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_folders" ADD CONSTRAINT "document_folders_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_files" ADD CONSTRAINT "document_files_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "document_folders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_shares" ADD CONSTRAINT "document_shares_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "document_folders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_shares" ADD CONSTRAINT "document_shares_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "document_files"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_shares" ADD CONSTRAINT "document_shares_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

