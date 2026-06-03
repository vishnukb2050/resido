-- CreateEnum
CREATE TYPE "EventVisibility" AS ENUM ('COMMUNITY', 'CONTACTS', 'GROUPS', 'PRIVATE');

-- CreateEnum
CREATE TYPE "MediaType" AS ENUM ('IMAGE', 'VIDEO');

-- CreateEnum
CREATE TYPE "AccessLevel" AS ENUM ('OWNER', 'EDITOR', 'VIEWER');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('INCOME', 'EXPENSE');

-- CreateEnum
CREATE TYPE "BlogInteractionType" AS ENUM ('LIKE', 'RESHARE', 'SAVE');

-- CreateEnum
CREATE TYPE "BlogType" AS ENUM ('THREAD', 'FLARE');

-- CreateEnum
CREATE TYPE "BlogMediaType" AS ENUM ('IMAGE', 'VIDEO');

-- CreateEnum
CREATE TYPE "BlogVisibility" AS ENUM ('PUBLIC', 'CONTACTS', 'FOLLOWERS');

-- CreateEnum
CREATE TYPE "GatepassStatus" AS ENUM ('PENDING', 'APPROVED', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "MemberRole" AS ENUM ('APARTMENT_ADMIN', 'RESIDENT', 'CLEANING_STAFF', 'CARETAKER', 'SECURITY_STAFF', 'ACCOUNTS_STAFF', 'MAINTENANCE_STAFF', 'ADMIN_STAFF', 'STAFF', 'SERVICE_STAFF', 'ACCOUNTS', 'MANAGER_STAFF', 'MEMBER', 'NOT_APPLICABLE');

-- CreateEnum
CREATE TYPE "DepartmentType" AS ENUM ('RESIDENTS', 'CLEANING', 'CARETAKERS', 'SECURITY', 'ACCOUNTS', 'MAINTENANCE', 'MANAGEMENT', 'NOT_APPLICABLE');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('NOTICE', 'COMPLAINT_UPDATE', 'VISITOR_ARRIVED', 'PAYMENT_REMINDER', 'POLL', 'CHAT', 'GENERAL', 'EVENT');

-- CreateEnum
CREATE TYPE "ComplaintStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED');

-- CreateEnum
CREATE TYPE "Priority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "VisitorStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'ENTERED', 'EXITED');

-- CreateEnum
CREATE TYPE "OccupancyType" AS ENUM ('RESIDENT', 'RENTAL');

-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('PRESENT', 'OUT_OF_AREA');

-- CreateEnum
CREATE TYPE "BillingCycle" AS ENUM ('MONTHLY', 'QUARTERLY', 'ANNUALLY');

-- CreateEnum
CREATE TYPE "CalculationType" AS ENUM ('FLAT_RATE', 'AREA_BASED');

-- CreateEnum
CREATE TYPE "BillStatus" AS ENUM ('UNPAID', 'PENDING_VERIFICATION', 'PAID', 'OVERDUE');

-- CreateEnum
CREATE TYPE "PenaltyType" AS ENUM ('NONE', 'FLAT', 'PERCENTAGE');

-- CreateTable
CREATE TABLE "apartments" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "pincode" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "apartments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blocks" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "apartmentId" TEXT NOT NULL,

    CONSTRAINT "blocks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "units" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "floor" INTEGER NOT NULL,
    "blockId" TEXT NOT NULL,
    "superBuiltUpArea" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "units_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "departments" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "DepartmentType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "departments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "department_members" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "department_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "families" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "families_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "members" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "role" "MemberRole" NOT NULL DEFAULT 'RESIDENT',
    "profilePhoto" TEXT,
    "profileName" TEXT,
    "phoneVisibility" TEXT NOT NULL DEFAULT 'COMMUNITY',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "occupancyType" "OccupancyType" NOT NULL DEFAULT 'RESIDENT',
    "address" TEXT,
    "tenantName" TEXT,
    "tenantPhone" TEXT,
    "familyId" TEXT,
    "instagram" TEXT,
    "linkedin" TEXT,
    "website" TEXT,
    "location" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notices" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "postedBy" TEXT NOT NULL,
    "photoUrl" TEXT,
    "sendWhatsApp" BOOLEAN NOT NULL DEFAULT false,
    "whatsAppSentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "polls" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "polls_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "poll_options" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "pollId" TEXT NOT NULL,
    "text" TEXT NOT NULL,

    CONSTRAINT "poll_options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "poll_votes" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "optionId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "votedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "poll_votes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "groups" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "group_members" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,

    CONSTRAINT "group_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "complaints" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "ComplaintStatus" NOT NULL DEFAULT 'OPEN',
    "priority" "Priority" NOT NULL DEFAULT 'MEDIUM',
    "memberId" TEXT,
    "category" TEXT,
    "assignedTo" TEXT,
    "mediaUrls" TEXT[],
    "progressNotes" JSONB,
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "complaints_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "visitors" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "purpose" TEXT,
    "category" TEXT,
    "description" TEXT,
    "personsCount" INTEGER NOT NULL DEFAULT 1,
    "unitToVisit" TEXT,
    "entryTime" TIMESTAMP(3),
    "exitTime" TIMESTAMP(3),
    "passCode" TEXT NOT NULL,
    "status" "VisitorStatus" NOT NULL DEFAULT 'PENDING',
    "memberId" TEXT NOT NULL,
    "vehicleNumber" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "visitors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "events" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "location" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "visibility" "EventVisibility" NOT NULL DEFAULT 'COMMUNITY',
    "sharedWithIds" TEXT[],
    "audience" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "hasAlert" BOOLEAN NOT NULL DEFAULT false,
    "alertTime" TIMESTAMP(3),
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gallery_folders" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gallery_folders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gallery" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "folderId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "mediaUrls" TEXT[],
    "type" "MediaType" NOT NULL DEFAULT 'IMAGE',
    "category" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gallery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "doc_folders" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT NOT NULL DEFAULT '#6366f1',
    "ownerId" TEXT NOT NULL,
    "isPrivate" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "doc_folders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "doc_files" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "folderId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "fileUrl" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "fileSize" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "doc_files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "doc_permissions" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "fileId" TEXT,
    "folderId" TEXT,
    "memberId" TEXT,
    "groupId" TEXT,
    "accessLevel" "AccessLevel" NOT NULL DEFAULT 'VIEWER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "doc_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "note_folders" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT NOT NULL DEFAULT '#6366f1',
    "ownerId" TEXT NOT NULL,
    "isPrivate" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "note_folders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notes" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "folderId" TEXT,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "bgColor" TEXT NOT NULL DEFAULT '#ffffff',
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "ownerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "note_permissions" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "noteId" TEXT,
    "folderId" TEXT,
    "memberId" TEXT,
    "groupId" TEXT,
    "accessLevel" "AccessLevel" NOT NULL DEFAULT 'VIEWER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "note_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "finance_transactions" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "type" "TransactionType" NOT NULL DEFAULT 'EXPENSE',
    "categoryId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paymentMethod" TEXT NOT NULL DEFAULT 'CASH',
    "description" TEXT,
    "billUrl" TEXT,
    "tags" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "finance_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "finance_categories" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "icon" TEXT,
    "color" TEXT,
    "type" "TransactionType" NOT NULL DEFAULT 'EXPENSE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "finance_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "finance_budgets" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "finance_budgets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blogs" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "authorName" TEXT,
    "authorAvatar" TEXT,
    "location" TEXT,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "category" TEXT,
    "type" "BlogType" NOT NULL DEFAULT 'THREAD',
    "mediaUrls" TEXT[],
    "mediaType" "BlogMediaType" NOT NULL DEFAULT 'IMAGE',
    "musicName" TEXT DEFAULT 'Original Audio',
    "musicId" TEXT,
    "tags" TEXT[],
    "hashtags" TEXT[],
    "visibility" "BlogVisibility" NOT NULL DEFAULT 'PUBLIC',
    "targetCommunities" TEXT[],
    "audioUrl" TEXT,
    "commentsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "businessProfileId" TEXT,
    "likesCount" INTEGER NOT NULL DEFAULT 0,
    "commentsCount" INTEGER NOT NULL DEFAULT 0,
    "resharesCount" INTEGER NOT NULL DEFAULT 0,
    "savesCount" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "parentId" TEXT,
    "pollId" TEXT,

    CONSTRAINT "blogs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blog_polls" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT 'global',
    "question" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "blog_polls_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blog_poll_options" (
    "id" TEXT NOT NULL,
    "pollId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT 'global',
    "text" TEXT NOT NULL,

    CONSTRAINT "blog_poll_options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blog_poll_votes" (
    "id" TEXT NOT NULL,
    "pollId" TEXT NOT NULL,
    "optionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT 'global',

    CONSTRAINT "blog_poll_votes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blog_comments" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT 'global',
    "blogId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userName" TEXT NOT NULL,
    "userAvatar" TEXT,
    "content" TEXT NOT NULL,
    "likesCount" INTEGER NOT NULL DEFAULT 0,
    "pollId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "blog_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blog_interactions" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT 'global',
    "blogId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "BlogInteractionType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "blog_interactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business_profiles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tenantId" TEXT,
    "profileType" TEXT NOT NULL DEFAULT 'BUSINESS',
    "businessName" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "subcategory" TEXT,
    "businessType" TEXT NOT NULL DEFAULT 'INDIVIDUAL',
    "about" TEXT NOT NULL,
    "logo" TEXT,
    "experience" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "website" TEXT,
    "workingHours" JSONB,
    "instagram" TEXT,
    "linkedin" TEXT,
    "hashtags" TEXT,
    "location" TEXT,
    "area" TEXT,
    "fullAddress" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "serviceAreaType" TEXT DEFAULT 'PINCODE',
    "serviceAreaValues" TEXT[],
    "serviceRadiusKm" INTEGER DEFAULT 10,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "business_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business_services" (
    "id" TEXT NOT NULL,
    "businessProfileId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "pricingType" TEXT NOT NULL DEFAULT 'FIXED',
    "price" DOUBLE PRECISION,
    "responseTime" TEXT,
    "isEmergency" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "business_services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business_slots" (
    "id" TEXT NOT NULL,
    "businessProfileId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "maxPersons" INTEGER NOT NULL DEFAULT 1,
    "timeSlots" TEXT[],
    "availableDates" TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "scheduleType" TEXT NOT NULL DEFAULT 'CUSTOM',
    "scheduleConfig" TEXT,
    "allowRecurringBookings" BOOLEAN NOT NULL DEFAULT false,
    "advanceBookingWeeks" INTEGER NOT NULL DEFAULT 4,

    CONSTRAINT "business_slots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business_bookings" (
    "id" TEXT NOT NULL,
    "businessProfileId" TEXT NOT NULL,
    "slotId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userName" TEXT,
    "userPhone" TEXT,
    "bookingDate" TEXT NOT NULL,
    "timeSlot" TEXT NOT NULL,
    "persons" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'CONFIRMED',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tokenNumber" INTEGER,
    "isRecurring" BOOLEAN NOT NULL DEFAULT false,
    "recurringPeriod" TEXT,
    "parentBookingId" TEXT,

    CONSTRAINT "business_bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business_booking_updates" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "message" TEXT,
    "photoUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "authorUserId" TEXT NOT NULL,

    CONSTRAINT "business_booking_updates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "visitor_entries" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "visitorName" TEXT NOT NULL,
    "phone" TEXT,
    "purpose" TEXT,
    "unitToVisit" TEXT NOT NULL,
    "category" TEXT,
    "description" TEXT,
    "vehicleNumber" TEXT,
    "photoUrl" TEXT,
    "inTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "outTime" TIMESTAMP(3),
    "loggedBy" TEXT NOT NULL,
    "gatepassId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "visitor_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gatepasses" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "visitorName" TEXT NOT NULL,
    "phone" TEXT,
    "personsCount" INTEGER NOT NULL DEFAULT 1,
    "purpose" TEXT,
    "vehicleNumber" TEXT,
    "visitTime" TEXT,
    "visitDate" TEXT,
    "status" "GatepassStatus" NOT NULL DEFAULT 'PENDING',
    "residentId" TEXT NOT NULL,
    "residentName" TEXT,
    "residentUnit" TEXT,
    "approvedAt" TIMESTAMP(3),
    "approvedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gatepasses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cleaning_logs" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "loggedBy" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "areas" TEXT[],
    "notes" TEXT,
    "photoUrls" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cleaning_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rules" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT,
    "photoUrl" TEXT,
    "audience" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "amenities" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "rules" TEXT,
    "photoUrl" TEXT,
    "maxPersons" INTEGER NOT NULL DEFAULT 1,
    "timeSlots" TEXT[],
    "availableDates" TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "scheduleType" TEXT NOT NULL DEFAULT 'CUSTOM',
    "scheduleConfig" TEXT,
    "allowRecurringBookings" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "amenities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "amenity_bookings" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "amenityId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "bookingDate" TEXT NOT NULL,
    "timeSlot" TEXT NOT NULL,
    "persons" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'CONFIRMED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isRecurring" BOOLEAN NOT NULL DEFAULT false,
    "recurringPeriod" TEXT,
    "parentBookingId" TEXT,

    CONSTRAINT "amenity_bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "community_transactions" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "type" "TransactionType" NOT NULL DEFAULT 'EXPENSE',
    "category" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "description" TEXT,
    "paymentMethod" TEXT NOT NULL DEFAULT 'CASH',
    "billUrl" TEXT,
    "addedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "maintenanceBillId" TEXT,

    CONSTRAINT "community_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance_configs" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "radiusMeters" INTEGER NOT NULL DEFAULT 500,
    "address" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "attendance_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance_records" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "markedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "date" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "distanceMeters" DOUBLE PRECISION NOT NULL,
    "status" "AttendanceStatus" NOT NULL DEFAULT 'PRESENT',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attendance_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "maintenance_configs" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "billingCycle" "BillingCycle" NOT NULL DEFAULT 'MONTHLY',
    "calculationType" "CalculationType" NOT NULL DEFAULT 'FLAT_RATE',
    "flatRateAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ratePerSqFt" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "dueDateDay" INTEGER NOT NULL DEFAULT 10,
    "penaltyType" "PenaltyType" NOT NULL DEFAULT 'NONE',
    "penaltyAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "maintenance_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "maintenance_bills" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "baseAmount" DOUBLE PRECISION NOT NULL,
    "otherCharges" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "penaltyAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "amountPaid" DOUBLE PRECISION,
    "status" "BillStatus" NOT NULL DEFAULT 'UNPAID',
    "dueDate" TIMESTAMP(3) NOT NULL,
    "paymentDate" TIMESTAMP(3),
    "paymentMethod" TEXT,
    "receiptUrl" TEXT,
    "description" TEXT,
    "adminNote" TEXT,
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "maintenance_bills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_splits" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "description" TEXT,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "splitMode" TEXT NOT NULL DEFAULT 'EQUAL',
    "targetType" TEXT NOT NULL,
    "targetBlocks" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "targetUnits" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "dueDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_splits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_split_shares" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "splitId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "amountPaid" DOUBLE PRECISION,
    "status" "BillStatus" NOT NULL DEFAULT 'UNPAID',
    "paymentDate" TIMESTAMP(3),
    "paymentMethod" TEXT,
    "receiptUrl" TEXT,
    "description" TEXT,
    "adminNote" TEXT,
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_split_shares_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "community_assets" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "serialNumber" TEXT,
    "purchaseDate" TIMESTAMP(3),
    "purchaseCost" DOUBLE PRECISION,
    "warrantyExpiry" TIMESTAMP(3),
    "location" TEXT,
    "description" TEXT,
    "photoUrl" TEXT,
    "billUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "community_assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reminders" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "imageUrl" TEXT,
    "category" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetRoles" TEXT[],
    "targetUnits" TEXT[],
    "targetMembers" TEXT[],
    "scheduledAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "sentAt" TIMESTAMP(3),
    "recurrence" TEXT NOT NULL DEFAULT 'ONCE',
    "recurrenceDetail" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reminders_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "apartments_tenantId_idx" ON "apartments"("tenantId");

-- CreateIndex
CREATE INDEX "blocks_tenantId_idx" ON "blocks"("tenantId");

-- CreateIndex
CREATE INDEX "blocks_tenantId_apartmentId_idx" ON "blocks"("tenantId", "apartmentId");

-- CreateIndex
CREATE INDEX "units_tenantId_idx" ON "units"("tenantId");

-- CreateIndex
CREATE INDEX "units_tenantId_blockId_idx" ON "units"("tenantId", "blockId");

-- CreateIndex
CREATE INDEX "departments_tenantId_idx" ON "departments"("tenantId");

-- CreateIndex
CREATE INDEX "department_members_tenantId_idx" ON "department_members"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "department_members_departmentId_memberId_key" ON "department_members"("departmentId", "memberId");

-- CreateIndex
CREATE INDEX "families_tenantId_idx" ON "families"("tenantId");

-- CreateIndex
CREATE INDEX "families_tenantId_unitId_idx" ON "families"("tenantId", "unitId");

-- CreateIndex
CREATE INDEX "members_tenantId_idx" ON "members"("tenantId");

-- CreateIndex
CREATE INDEX "members_tenantId_userId_idx" ON "members"("tenantId", "userId");

-- CreateIndex
CREATE INDEX "members_tenantId_familyId_idx" ON "members"("tenantId", "familyId");

-- CreateIndex
CREATE INDEX "members_tenantId_role_isActive_idx" ON "members"("tenantId", "role", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "members_tenantId_phone_key" ON "members"("tenantId", "phone");

-- CreateIndex
CREATE INDEX "notices_tenantId_idx" ON "notices"("tenantId");

-- CreateIndex
CREATE INDEX "notices_tenantId_createdAt_idx" ON "notices"("tenantId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "polls_tenantId_idx" ON "polls"("tenantId");

-- CreateIndex
CREATE INDEX "poll_options_tenantId_idx" ON "poll_options"("tenantId");

-- CreateIndex
CREATE INDEX "poll_options_pollId_idx" ON "poll_options"("pollId");

-- CreateIndex
CREATE INDEX "poll_votes_tenantId_idx" ON "poll_votes"("tenantId");

-- CreateIndex
CREATE INDEX "poll_votes_memberId_idx" ON "poll_votes"("memberId");

-- CreateIndex
CREATE UNIQUE INDEX "poll_votes_optionId_memberId_key" ON "poll_votes"("optionId", "memberId");

-- CreateIndex
CREATE INDEX "groups_tenantId_idx" ON "groups"("tenantId");

-- CreateIndex
CREATE INDEX "group_members_tenantId_idx" ON "group_members"("tenantId");

-- CreateIndex
CREATE INDEX "group_members_memberId_idx" ON "group_members"("memberId");

-- CreateIndex
CREATE UNIQUE INDEX "group_members_groupId_memberId_key" ON "group_members"("groupId", "memberId");

-- CreateIndex
CREATE INDEX "notifications_tenantId_idx" ON "notifications"("tenantId");

-- CreateIndex
CREATE INDEX "notifications_tenantId_memberId_isRead_createdAt_idx" ON "notifications"("tenantId", "memberId", "isRead", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "complaints_tenantId_idx" ON "complaints"("tenantId");

-- CreateIndex
CREATE INDEX "complaints_tenantId_status_createdAt_idx" ON "complaints"("tenantId", "status", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "complaints_tenantId_memberId_createdAt_idx" ON "complaints"("tenantId", "memberId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "complaints_tenantId_assignedTo_createdAt_idx" ON "complaints"("tenantId", "assignedTo", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "visitors_tenantId_idx" ON "visitors"("tenantId");

-- CreateIndex
CREATE INDEX "visitors_tenantId_createdAt_idx" ON "visitors"("tenantId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "visitors_tenantId_status_createdAt_idx" ON "visitors"("tenantId", "status", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "visitors_tenantId_memberId_createdAt_idx" ON "visitors"("tenantId", "memberId", "createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "visitors_tenantId_passCode_key" ON "visitors"("tenantId", "passCode");

-- CreateIndex
CREATE INDEX "events_tenantId_idx" ON "events"("tenantId");

-- CreateIndex
CREATE INDEX "events_tenantId_startDate_idx" ON "events"("tenantId", "startDate");

-- CreateIndex
CREATE INDEX "gallery_folders_tenantId_idx" ON "gallery_folders"("tenantId");

-- CreateIndex
CREATE INDEX "gallery_tenantId_idx" ON "gallery"("tenantId");

-- CreateIndex
CREATE INDEX "gallery_tenantId_folderId_idx" ON "gallery"("tenantId", "folderId");

-- CreateIndex
CREATE INDEX "doc_folders_tenantId_ownerId_idx" ON "doc_folders"("tenantId", "ownerId");

-- CreateIndex
CREATE INDEX "doc_files_tenantId_ownerId_idx" ON "doc_files"("tenantId", "ownerId");

-- CreateIndex
CREATE INDEX "doc_permissions_tenantId_idx" ON "doc_permissions"("tenantId");

-- CreateIndex
CREATE INDEX "doc_permissions_tenantId_memberId_idx" ON "doc_permissions"("tenantId", "memberId");

-- CreateIndex
CREATE INDEX "doc_permissions_tenantId_groupId_idx" ON "doc_permissions"("tenantId", "groupId");

-- CreateIndex
CREATE INDEX "note_folders_tenantId_ownerId_idx" ON "note_folders"("tenantId", "ownerId");

-- CreateIndex
CREATE INDEX "notes_tenantId_ownerId_idx" ON "notes"("tenantId", "ownerId");

-- CreateIndex
CREATE INDEX "note_permissions_tenantId_idx" ON "note_permissions"("tenantId");

-- CreateIndex
CREATE INDEX "finance_transactions_tenantId_memberId_idx" ON "finance_transactions"("tenantId", "memberId");

-- CreateIndex
CREATE INDEX "finance_transactions_tenantId_memberId_date_idx" ON "finance_transactions"("tenantId", "memberId", "date" DESC);

-- CreateIndex
CREATE INDEX "finance_transactions_tenantId_memberId_type_date_idx" ON "finance_transactions"("tenantId", "memberId", "type", "date" DESC);

-- CreateIndex
CREATE INDEX "finance_categories_tenantId_idx" ON "finance_categories"("tenantId");

-- CreateIndex
CREATE INDEX "finance_budgets_tenantId_memberId_idx" ON "finance_budgets"("tenantId", "memberId");

-- CreateIndex
CREATE UNIQUE INDEX "finance_budgets_memberId_categoryId_month_year_key" ON "finance_budgets"("memberId", "categoryId", "month", "year");

-- CreateIndex
CREATE INDEX "blogs_tenantId_idx" ON "blogs"("tenantId");

-- CreateIndex
CREATE INDEX "blogs_businessProfileId_idx" ON "blogs"("businessProfileId");

-- CreateIndex
CREATE INDEX "blogs_tenantId_isActive_type_visibility_createdAt_id_idx" ON "blogs"("tenantId", "isActive", "type", "visibility", "createdAt" DESC, "id" DESC);

-- CreateIndex
CREATE INDEX "blogs_isActive_visibility_createdAt_id_idx" ON "blogs"("isActive", "visibility", "createdAt" DESC, "id" DESC);

-- CreateIndex
CREATE INDEX "blogs_authorId_isActive_createdAt_id_idx" ON "blogs"("authorId", "isActive", "createdAt" DESC, "id" DESC);

-- CreateIndex
CREATE INDEX "blogs_businessProfileId_isActive_createdAt_id_idx" ON "blogs"("businessProfileId", "isActive", "createdAt" DESC, "id" DESC);

-- CreateIndex
CREATE INDEX "blogs_parentId_authorId_tenantId_idx" ON "blogs"("parentId", "authorId", "tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "blogs_id_tenantId_key" ON "blogs"("id", "tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "blog_polls_id_tenantId_key" ON "blog_polls"("id", "tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "blog_poll_options_id_tenantId_key" ON "blog_poll_options"("id", "tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "blog_poll_votes_id_tenantId_key" ON "blog_poll_votes"("id", "tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "blog_poll_votes_pollId_userId_tenantId_key" ON "blog_poll_votes"("pollId", "userId", "tenantId");

-- CreateIndex
CREATE INDEX "blog_comments_blogId_tenantId_idx" ON "blog_comments"("blogId", "tenantId");

-- CreateIndex
CREATE INDEX "blog_comments_tenantId_idx" ON "blog_comments"("tenantId");

-- CreateIndex
CREATE INDEX "blog_comments_blogId_tenantId_createdAt_idx" ON "blog_comments"("blogId", "tenantId", "createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "blog_comments_id_tenantId_key" ON "blog_comments"("id", "tenantId");

-- CreateIndex
CREATE INDEX "blog_interactions_tenantId_idx" ON "blog_interactions"("tenantId");

-- CreateIndex
CREATE INDEX "blog_interactions_userId_type_tenantId_createdAt_idx" ON "blog_interactions"("userId", "type", "tenantId", "createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "blog_interactions_id_tenantId_key" ON "blog_interactions"("id", "tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "blog_interactions_blogId_userId_type_tenantId_key" ON "blog_interactions"("blogId", "userId", "type", "tenantId");

-- CreateIndex
CREATE INDEX "business_profiles_userId_idx" ON "business_profiles"("userId");

-- CreateIndex
CREATE INDEX "business_profiles_tenantId_idx" ON "business_profiles"("tenantId");

-- CreateIndex
CREATE INDEX "business_profiles_category_idx" ON "business_profiles"("category");

-- CreateIndex
CREATE INDEX "business_slots_businessProfileId_idx" ON "business_slots"("businessProfileId");

-- CreateIndex
CREATE INDEX "business_bookings_businessProfileId_idx" ON "business_bookings"("businessProfileId");

-- CreateIndex
CREATE INDEX "business_bookings_slotId_idx" ON "business_bookings"("slotId");

-- CreateIndex
CREATE INDEX "business_bookings_userId_idx" ON "business_bookings"("userId");

-- CreateIndex
CREATE INDEX "business_bookings_businessProfileId_bookingDate_idx" ON "business_bookings"("businessProfileId", "bookingDate");

-- CreateIndex
CREATE INDEX "business_booking_updates_bookingId_idx" ON "business_booking_updates"("bookingId");

-- CreateIndex
CREATE INDEX "visitor_entries_tenantId_idx" ON "visitor_entries"("tenantId");

-- CreateIndex
CREATE INDEX "visitor_entries_tenantId_inTime_idx" ON "visitor_entries"("tenantId", "inTime" DESC);

-- CreateIndex
CREATE INDEX "gatepasses_tenantId_idx" ON "gatepasses"("tenantId");

-- CreateIndex
CREATE INDEX "gatepasses_tenantId_residentId_createdAt_idx" ON "gatepasses"("tenantId", "residentId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "cleaning_logs_tenantId_idx" ON "cleaning_logs"("tenantId");

-- CreateIndex
CREATE INDEX "cleaning_logs_tenantId_createdAt_idx" ON "cleaning_logs"("tenantId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "rules_tenantId_idx" ON "rules"("tenantId");

-- CreateIndex
CREATE INDEX "amenities_tenantId_idx" ON "amenities"("tenantId");

-- CreateIndex
CREATE INDEX "amenity_bookings_tenantId_idx" ON "amenity_bookings"("tenantId");

-- CreateIndex
CREATE INDEX "amenity_bookings_tenantId_amenityId_bookingDate_timeSlot_st_idx" ON "amenity_bookings"("tenantId", "amenityId", "bookingDate", "timeSlot", "status");

-- CreateIndex
CREATE INDEX "amenity_bookings_tenantId_memberId_createdAt_idx" ON "amenity_bookings"("tenantId", "memberId", "createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "community_transactions_maintenanceBillId_key" ON "community_transactions"("maintenanceBillId");

-- CreateIndex
CREATE INDEX "community_transactions_tenantId_idx" ON "community_transactions"("tenantId");

-- CreateIndex
CREATE INDEX "community_transactions_tenantId_date_idx" ON "community_transactions"("tenantId", "date" DESC);

-- CreateIndex
CREATE INDEX "community_transactions_tenantId_type_date_idx" ON "community_transactions"("tenantId", "type", "date" DESC);

-- CreateIndex
CREATE INDEX "community_transactions_tenantId_category_date_idx" ON "community_transactions"("tenantId", "category", "date" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "attendance_configs_tenantId_key" ON "attendance_configs"("tenantId");

-- CreateIndex
CREATE INDEX "attendance_records_tenantId_date_idx" ON "attendance_records"("tenantId", "date");

-- CreateIndex
CREATE INDEX "attendance_records_tenantId_memberId_idx" ON "attendance_records"("tenantId", "memberId");

-- CreateIndex
CREATE UNIQUE INDEX "attendance_records_tenantId_memberId_date_key" ON "attendance_records"("tenantId", "memberId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "maintenance_configs_tenantId_key" ON "maintenance_configs"("tenantId");

-- CreateIndex
CREATE INDEX "maintenance_configs_tenantId_idx" ON "maintenance_configs"("tenantId");

-- CreateIndex
CREATE INDEX "maintenance_bills_tenantId_idx" ON "maintenance_bills"("tenantId");

-- CreateIndex
CREATE INDEX "maintenance_bills_tenantId_year_month_idx" ON "maintenance_bills"("tenantId", "year", "month");

-- CreateIndex
CREATE INDEX "maintenance_bills_tenantId_unitId_year_month_idx" ON "maintenance_bills"("tenantId", "unitId", "year" DESC, "month" DESC);

-- CreateIndex
CREATE INDEX "maintenance_bills_tenantId_status_dueDate_idx" ON "maintenance_bills"("tenantId", "status", "dueDate");

-- CreateIndex
CREATE UNIQUE INDEX "maintenance_bills_unitId_month_year_key" ON "maintenance_bills"("unitId", "month", "year");

-- CreateIndex
CREATE INDEX "payment_splits_tenantId_idx" ON "payment_splits"("tenantId");

-- CreateIndex
CREATE INDEX "payment_split_shares_tenantId_idx" ON "payment_split_shares"("tenantId");

-- CreateIndex
CREATE INDEX "payment_split_shares_tenantId_unitId_status_idx" ON "payment_split_shares"("tenantId", "unitId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "payment_split_shares_splitId_unitId_key" ON "payment_split_shares"("splitId", "unitId");

-- CreateIndex
CREATE INDEX "community_assets_tenantId_idx" ON "community_assets"("tenantId");

-- CreateIndex
CREATE INDEX "reminders_tenantId_idx" ON "reminders"("tenantId");

-- AddForeignKey
ALTER TABLE "blocks" ADD CONSTRAINT "blocks_apartmentId_fkey" FOREIGN KEY ("apartmentId") REFERENCES "apartments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "units" ADD CONSTRAINT "units_blockId_fkey" FOREIGN KEY ("blockId") REFERENCES "blocks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "department_members" ADD CONSTRAINT "department_members_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "department_members" ADD CONSTRAINT "department_members_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "families" ADD CONSTRAINT "families_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "members" ADD CONSTRAINT "members_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "families"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "poll_options" ADD CONSTRAINT "poll_options_pollId_fkey" FOREIGN KEY ("pollId") REFERENCES "polls"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "poll_votes" ADD CONSTRAINT "poll_votes_optionId_fkey" FOREIGN KEY ("optionId") REFERENCES "poll_options"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "poll_votes" ADD CONSTRAINT "poll_votes_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_members" ADD CONSTRAINT "group_members_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "groups"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_members" ADD CONSTRAINT "group_members_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "complaints" ADD CONSTRAINT "complaints_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visitors" ADD CONSTRAINT "visitors_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gallery" ADD CONSTRAINT "gallery_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "gallery_folders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doc_folders" ADD CONSTRAINT "doc_folders_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doc_files" ADD CONSTRAINT "doc_files_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "doc_folders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doc_files" ADD CONSTRAINT "doc_files_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doc_permissions" ADD CONSTRAINT "doc_permissions_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "doc_files"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doc_permissions" ADD CONSTRAINT "doc_permissions_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "doc_folders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doc_permissions" ADD CONSTRAINT "doc_permissions_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doc_permissions" ADD CONSTRAINT "doc_permissions_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "note_folders" ADD CONSTRAINT "note_folders_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notes" ADD CONSTRAINT "notes_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "note_folders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notes" ADD CONSTRAINT "notes_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "note_permissions" ADD CONSTRAINT "note_permissions_noteId_fkey" FOREIGN KEY ("noteId") REFERENCES "notes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "note_permissions" ADD CONSTRAINT "note_permissions_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "note_folders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "note_permissions" ADD CONSTRAINT "note_permissions_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "note_permissions" ADD CONSTRAINT "note_permissions_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance_transactions" ADD CONSTRAINT "finance_transactions_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance_transactions" ADD CONSTRAINT "finance_transactions_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "finance_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance_budgets" ADD CONSTRAINT "finance_budgets_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance_budgets" ADD CONSTRAINT "finance_budgets_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "finance_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blogs" ADD CONSTRAINT "blogs_pollId_tenantId_fkey" FOREIGN KEY ("pollId", "tenantId") REFERENCES "blog_polls"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blog_poll_options" ADD CONSTRAINT "blog_poll_options_pollId_tenantId_fkey" FOREIGN KEY ("pollId", "tenantId") REFERENCES "blog_polls"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blog_poll_votes" ADD CONSTRAINT "blog_poll_votes_pollId_tenantId_fkey" FOREIGN KEY ("pollId", "tenantId") REFERENCES "blog_polls"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blog_poll_votes" ADD CONSTRAINT "blog_poll_votes_optionId_tenantId_fkey" FOREIGN KEY ("optionId", "tenantId") REFERENCES "blog_poll_options"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blog_comments" ADD CONSTRAINT "blog_comments_blogId_tenantId_fkey" FOREIGN KEY ("blogId", "tenantId") REFERENCES "blogs"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blog_comments" ADD CONSTRAINT "blog_comments_pollId_tenantId_fkey" FOREIGN KEY ("pollId", "tenantId") REFERENCES "blog_polls"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blog_interactions" ADD CONSTRAINT "blog_interactions_blogId_tenantId_fkey" FOREIGN KEY ("blogId", "tenantId") REFERENCES "blogs"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_services" ADD CONSTRAINT "business_services_businessProfileId_fkey" FOREIGN KEY ("businessProfileId") REFERENCES "business_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_slots" ADD CONSTRAINT "business_slots_businessProfileId_fkey" FOREIGN KEY ("businessProfileId") REFERENCES "business_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_bookings" ADD CONSTRAINT "business_bookings_slotId_fkey" FOREIGN KEY ("slotId") REFERENCES "business_slots"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_booking_updates" ADD CONSTRAINT "business_booking_updates_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "business_bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "amenity_bookings" ADD CONSTRAINT "amenity_bookings_amenityId_fkey" FOREIGN KEY ("amenityId") REFERENCES "amenities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "amenity_bookings" ADD CONSTRAINT "amenity_bookings_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_transactions" ADD CONSTRAINT "community_transactions_maintenanceBillId_fkey" FOREIGN KEY ("maintenanceBillId") REFERENCES "maintenance_bills"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_bills" ADD CONSTRAINT "maintenance_bills_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_split_shares" ADD CONSTRAINT "payment_split_shares_splitId_fkey" FOREIGN KEY ("splitId") REFERENCES "payment_splits"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_split_shares" ADD CONSTRAINT "payment_split_shares_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

