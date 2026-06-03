-- CreateTable
CREATE TABLE "location_master" (
    "id" TEXT NOT NULL,
    "placeName" TEXT NOT NULL,
    "pincode" TEXT NOT NULL,
    "district" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "searchStr" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "location_master_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "location_master_searchStr_idx" ON "location_master"("searchStr");

-- CreateIndex
CREATE INDEX "location_master_pincode_idx" ON "location_master"("pincode");

-- CreateIndex
CREATE INDEX "location_master_district_idx" ON "location_master"("district");

-- CreateIndex
CREATE INDEX "location_master_state_idx" ON "location_master"("state");

-- CreateIndex
CREATE INDEX "location_master_state_district_idx" ON "location_master"("state", "district");

