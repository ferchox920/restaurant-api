CREATE TABLE "MercadoPagoPayment" (
  "id" UUID NOT NULL,
  "externalPaymentId" TEXT NOT NULL,
  "transactionAmount" DECIMAL(14,2) NOT NULL,
  "netReceivedAmount" DECIMAL(14,2),
  "transactionAmountRefunded" DECIMAL(14,2),
  "currencyId" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "statusDetail" TEXT,
  "paymentMethodId" TEXT,
  "paymentTypeId" TEXT,
  "installments" INTEGER,
  "externalReference" TEXT,
  "description" TEXT,
  "liveMode" BOOLEAN NOT NULL,
  "dateCreated" TIMESTAMP(3) NOT NULL,
  "dateApproved" TIMESTAMP(3),
  "dateLastUpdated" TIMESTAMP(3) NOT NULL,
  "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MercadoPagoPayment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MercadoPagoPayment_externalPaymentId_key"
  ON "MercadoPagoPayment"("externalPaymentId");
CREATE INDEX "MercadoPagoPayment_status_idx"
  ON "MercadoPagoPayment"("status");
CREATE INDEX "MercadoPagoPayment_dateCreated_idx"
  ON "MercadoPagoPayment"("dateCreated");
CREATE INDEX "MercadoPagoPayment_status_dateCreated_idx"
  ON "MercadoPagoPayment"("status", "dateCreated");
