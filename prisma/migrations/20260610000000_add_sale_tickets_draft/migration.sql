-- CreateEnum
CREATE TYPE "SaleTicketStatus" AS ENUM ('DRAFT', 'CONFIRMED', 'CANCELLED', 'VOIDED');

-- CreateTable
CREATE TABLE "SaleTicket" (
    "id" UUID NOT NULL,
    "ticketNumber" SERIAL NOT NULL,
    "salesChannelId" UUID NOT NULL,
    "status" "SaleTicketStatus" NOT NULL DEFAULT 'DRAFT',
    "subtotal" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "discountTotal" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "commissionTotal" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdById" UUID,
    "cancelledById" UUID,
    "cancellationReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "cancelledAt" TIMESTAMP(3),

    CONSTRAINT "SaleTicket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SaleTicketItem" (
    "id" UUID NOT NULL,
    "ticketId" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "productNameSnapshot" TEXT NOT NULL,
    "productSkuSnapshot" TEXT,
    "productUnitSnapshot" "ProductUnit" NOT NULL,
    "quantity" DECIMAL(10,2) NOT NULL,
    "unitPriceSnapshot" DECIMAL(10,2) NOT NULL,
    "unitCostSnapshot" DECIMAL(10,2) NOT NULL,
    "subtotal" DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SaleTicketItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SaleTicket_ticketNumber_key" ON "SaleTicket"("ticketNumber");

-- CreateIndex
CREATE INDEX "SaleTicket_salesChannelId_idx" ON "SaleTicket"("salesChannelId");

-- CreateIndex
CREATE INDEX "SaleTicket_status_idx" ON "SaleTicket"("status");

-- CreateIndex
CREATE INDEX "SaleTicket_createdAt_idx" ON "SaleTicket"("createdAt");

-- CreateIndex
CREATE INDEX "SaleTicket_status_createdAt_idx" ON "SaleTicket"("status", "createdAt");

-- CreateIndex
CREATE INDEX "SaleTicketItem_ticketId_idx" ON "SaleTicketItem"("ticketId");

-- CreateIndex
CREATE INDEX "SaleTicketItem_productId_idx" ON "SaleTicketItem"("productId");

-- AddForeignKey
ALTER TABLE "SaleTicket" ADD CONSTRAINT "SaleTicket_salesChannelId_fkey" FOREIGN KEY ("salesChannelId") REFERENCES "SalesChannel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleTicketItem" ADD CONSTRAINT "SaleTicketItem_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "SaleTicket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleTicketItem" ADD CONSTRAINT "SaleTicketItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
