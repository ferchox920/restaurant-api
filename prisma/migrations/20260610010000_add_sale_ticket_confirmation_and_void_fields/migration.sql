ALTER TABLE "SaleTicket"
ADD COLUMN "confirmedById" UUID,
ADD COLUMN "confirmedAt" TIMESTAMP(3),
ADD COLUMN "voidedById" UUID,
ADD COLUMN "voidedAt" TIMESTAMP(3),
ADD COLUMN "voidReason" TEXT;
