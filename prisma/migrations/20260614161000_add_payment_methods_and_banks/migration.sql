CREATE TYPE "SalePaymentMethod" AS ENUM ('CASH', 'TRANSFER');

ALTER TYPE "AuditAction" ADD VALUE 'PAYMENT_BANK_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'PAYMENT_BANK_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE 'PAYMENT_BANK_DEACTIVATED';
ALTER TYPE "AuditAction" ADD VALUE 'PAYMENT_BANK_REACTIVATED';

ALTER TYPE "AuditEntityType" ADD VALUE 'PAYMENT_BANK';

CREATE TABLE "PaymentBank" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentBank_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PaymentBank_name_key" ON "PaymentBank"("name");

ALTER TABLE "SaleTicket"
ADD COLUMN "paymentMethod" "SalePaymentMethod",
ADD COLUMN "paymentBankId" UUID,
ADD COLUMN "paymentBankNameSnapshot" TEXT;

CREATE INDEX "SaleTicket_paymentBankId_idx" ON "SaleTicket"("paymentBankId");

ALTER TABLE "SaleTicket"
ADD CONSTRAINT "SaleTicket_paymentBankId_fkey" FOREIGN KEY ("paymentBankId") REFERENCES "PaymentBank"("id") ON DELETE SET NULL ON UPDATE CASCADE;
