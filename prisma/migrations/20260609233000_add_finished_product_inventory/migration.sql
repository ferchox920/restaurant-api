-- CreateEnum
CREATE TYPE "InventoryMovementType" AS ENUM (
    'STOCK_IN',
    'SALE_OUT',
    'MANUAL_ADJUSTMENT',
    'WASTE',
    'RETURN_IN',
    'VOID_REVERSAL'
);

-- CreateEnum
CREATE TYPE "InventoryReferenceType" AS ENUM (
    'MANUAL',
    'SALE_TICKET',
    'SALE_VOID',
    'SYSTEM'
);

-- CreateTable
CREATE TABLE "ProductStock" (
    "id" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "currentStock" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "minimumStock" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductStock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryMovement" (
    "id" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "movementType" "InventoryMovementType" NOT NULL,
    "quantity" DECIMAL(10,2) NOT NULL,
    "previousStock" DECIMAL(10,2) NOT NULL,
    "newStock" DECIMAL(10,2) NOT NULL,
    "reason" TEXT NOT NULL,
    "referenceType" "InventoryReferenceType" NOT NULL DEFAULT 'MANUAL',
    "referenceId" TEXT,
    "createdById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InventoryMovement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProductStock_productId_key" ON "ProductStock"("productId");

-- CreateIndex
CREATE INDEX "InventoryMovement_productId_idx" ON "InventoryMovement"("productId");

-- CreateIndex
CREATE INDEX "InventoryMovement_movementType_idx" ON "InventoryMovement"("movementType");

-- CreateIndex
CREATE INDEX "InventoryMovement_createdAt_idx" ON "InventoryMovement"("createdAt");

-- CreateIndex
CREATE INDEX "InventoryMovement_productId_createdAt_idx" ON "InventoryMovement"("productId", "createdAt");

-- AddForeignKey
ALTER TABLE "ProductStock"
ADD CONSTRAINT "ProductStock_productId_fkey"
FOREIGN KEY ("productId") REFERENCES "Product"("id")
ON DELETE RESTRICT
ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryMovement"
ADD CONSTRAINT "InventoryMovement_productId_fkey"
FOREIGN KEY ("productId") REFERENCES "Product"("id")
ON DELETE RESTRICT
ON UPDATE CASCADE;
