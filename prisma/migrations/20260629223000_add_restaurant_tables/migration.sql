-- AlterEnum
ALTER TYPE "AuditAction" ADD VALUE 'RESTAURANT_TABLE_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'RESTAURANT_TABLE_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE 'RESTAURANT_TABLE_DEACTIVATED';
ALTER TYPE "AuditAction" ADD VALUE 'RESTAURANT_TABLE_REACTIVATED';

-- AlterEnum
ALTER TYPE "AuditEntityType" ADD VALUE 'RESTAURANT_TABLE';

-- CreateTable
CREATE TABLE "RestaurantTable" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT,
    "area" TEXT,
    "capacity" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RestaurantTable_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RestaurantTable_code_key" ON "RestaurantTable"("code");

-- CreateIndex
CREATE INDEX "RestaurantTable_active_idx" ON "RestaurantTable"("active");

-- CreateIndex
CREATE INDEX "RestaurantTable_area_idx" ON "RestaurantTable"("area");

-- CreateIndex
CREATE INDEX "RestaurantTable_code_idx" ON "RestaurantTable"("code");

-- AddForeignKey
ALTER TABLE "RestaurantTable" ADD CONSTRAINT "RestaurantTable_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddConstraint
ALTER TABLE "RestaurantTable" ADD CONSTRAINT "RestaurantTable_capacity_positive_chk" CHECK ("capacity" IS NULL OR "capacity" > 0);
