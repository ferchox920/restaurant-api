-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM (
    'USER_CREATED',
    'USER_UPDATED',
    'USER_DEACTIVATED',
    'USER_REACTIVATED',
    'CATEGORY_CREATED',
    'CATEGORY_UPDATED',
    'CATEGORY_DEACTIVATED',
    'CATEGORY_REACTIVATED',
    'SALES_CHANNEL_CREATED',
    'SALES_CHANNEL_UPDATED',
    'SALES_CHANNEL_DEACTIVATED',
    'SALES_CHANNEL_REACTIVATED',
    'PRODUCT_CREATED',
    'PRODUCT_UPDATED',
    'PRODUCT_DEACTIVATED',
    'PRODUCT_REACTIVATED',
    'PRODUCT_COST_CREATED',
    'PRODUCT_PRICE_CREATED',
    'INVENTORY_STOCK_IN',
    'INVENTORY_MANUAL_ADJUSTMENT',
    'INVENTORY_WASTE',
    'INVENTORY_RETURN_IN',
    'INVENTORY_SALE_OUT',
    'INVENTORY_VOID_REVERSAL',
    'INVENTORY_MINIMUM_STOCK_UPDATED',
    'SALE_TICKET_CREATED',
    'SALE_TICKET_UPDATED',
    'SALE_TICKET_CANCELLED',
    'SALE_TICKET_ITEM_ADDED',
    'SALE_TICKET_ITEM_UPDATED',
    'SALE_TICKET_ITEM_REMOVED',
    'SALE_TICKET_CONFIRMED',
    'SALE_TICKET_VOIDED'
);

-- CreateEnum
CREATE TYPE "AuditEntityType" AS ENUM (
    'USER',
    'CATEGORY',
    'SALES_CHANNEL',
    'PRODUCT',
    'PRODUCT_COST_HISTORY',
    'PRODUCT_PRICE_HISTORY',
    'PRODUCT_STOCK',
    'INVENTORY_MOVEMENT',
    'SALE_TICKET',
    'SALE_TICKET_ITEM',
    'SYSTEM'
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" UUID NOT NULL,
    "userId" UUID,
    "action" "AuditAction" NOT NULL,
    "entityType" "AuditEntityType" NOT NULL,
    "entityId" TEXT,
    "beforeData" JSONB,
    "afterData" JSONB,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_idx" ON "AuditLog"("entityType");

-- CreateIndex
CREATE INDEX "AuditLog_entityId_idx" ON "AuditLog"("entityId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_userId_createdAt_idx" ON "AuditLog"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "AuditLog"
ADD CONSTRAINT "AuditLog_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
