ALTER TYPE "SalePaymentMethod" ADD VALUE 'MERCADO_PAGO';

CREATE TABLE "MercadoPagoOrder" (
  "id" UUID NOT NULL,
  "saleTicketId" UUID NOT NULL,
  "externalOrderId" TEXT NOT NULL,
  "idempotencyKey" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "statusDetail" TEXT,
  "totalAmount" DECIMAL(14,2) NOT NULL,
  "totalPaidAmount" DECIMAL(14,2),
  "currencyId" TEXT NOT NULL,
  "paymentId" TEXT,
  "paymentStatus" TEXT,
  "paymentStatusDetail" TEXT,
  "paymentMethodId" TEXT,
  "paymentTypeId" TEXT,
  "installments" INTEGER,
  "checkoutUrl" TEXT,
  "createdById" UUID,
  "externalCreatedAt" TIMESTAMP(3),
  "externalUpdatedAt" TIMESTAMP(3),
  "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "reconciledAt" TIMESTAMP(3),
  "reconciliationError" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "MercadoPagoOrder_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MercadoPagoOrder_externalOrderId_key"
  ON "MercadoPagoOrder"("externalOrderId");
CREATE UNIQUE INDEX "MercadoPagoOrder_idempotencyKey_key"
  ON "MercadoPagoOrder"("idempotencyKey");
CREATE INDEX "MercadoPagoOrder_saleTicketId_idx"
  ON "MercadoPagoOrder"("saleTicketId");
CREATE INDEX "MercadoPagoOrder_status_idx"
  ON "MercadoPagoOrder"("status");
CREATE INDEX "MercadoPagoOrder_paymentStatus_idx"
  ON "MercadoPagoOrder"("paymentStatus");
CREATE INDEX "MercadoPagoOrder_externalUpdatedAt_idx"
  ON "MercadoPagoOrder"("externalUpdatedAt");

ALTER TABLE "MercadoPagoOrder"
  ADD CONSTRAINT "MercadoPagoOrder_saleTicketId_fkey"
  FOREIGN KEY ("saleTicketId") REFERENCES "SaleTicket"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
