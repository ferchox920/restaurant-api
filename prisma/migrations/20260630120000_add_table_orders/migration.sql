-- CreateEnum
CREATE TYPE "RestaurantTableOrderStatus" AS ENUM ('OPEN', 'CANCELLED', 'CLOSED');

-- AlterEnum
ALTER TYPE "AuditAction" ADD VALUE 'TABLE_ORDER_OPENED';
ALTER TYPE "AuditAction" ADD VALUE 'TABLE_ORDER_CANCELLED';

-- AlterEnum
ALTER TYPE "AuditEntityType" ADD VALUE 'TABLE_ORDER';

-- CreateTable
CREATE TABLE "TableOrder" (
    "id" UUID NOT NULL,
    "restaurantTableId" UUID NOT NULL,
    "saleTicketId" UUID NOT NULL,
    "status" "RestaurantTableOrderStatus" NOT NULL DEFAULT 'OPEN',
    "openedById" UUID,
    "cancelledById" UUID,
    "closedById" UUID,
    "notes" TEXT,
    "cancelReason" TEXT,
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cancelledAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TableOrder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TableOrder_saleTicketId_key" ON "TableOrder"("saleTicketId");

-- CreateIndex
CREATE INDEX "TableOrder_restaurantTableId_idx" ON "TableOrder"("restaurantTableId");

-- CreateIndex
CREATE INDEX "TableOrder_saleTicketId_idx" ON "TableOrder"("saleTicketId");

-- CreateIndex
CREATE INDEX "TableOrder_status_idx" ON "TableOrder"("status");

-- CreateIndex
CREATE INDEX "TableOrder_openedById_idx" ON "TableOrder"("openedById");

-- CreateIndex
CREATE INDEX "TableOrder_openedAt_idx" ON "TableOrder"("openedAt");

-- CreateIndex
CREATE INDEX "TableOrder_restaurantTableId_status_idx" ON "TableOrder"("restaurantTableId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "TableOrder_one_open_order_per_table_idx" ON "TableOrder"("restaurantTableId") WHERE "status" = 'OPEN';

-- AddForeignKey
ALTER TABLE "TableOrder" ADD CONSTRAINT "TableOrder_restaurantTableId_fkey" FOREIGN KEY ("restaurantTableId") REFERENCES "RestaurantTable"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TableOrder" ADD CONSTRAINT "TableOrder_saleTicketId_fkey" FOREIGN KEY ("saleTicketId") REFERENCES "SaleTicket"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TableOrder" ADD CONSTRAINT "TableOrder_openedById_fkey" FOREIGN KEY ("openedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TableOrder" ADD CONSTRAINT "TableOrder_cancelledById_fkey" FOREIGN KEY ("cancelledById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TableOrder" ADD CONSTRAINT "TableOrder_closedById_fkey" FOREIGN KEY ("closedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
