ALTER TABLE "SaleTicket" ADD COLUMN "version" BIGINT NOT NULL DEFAULT 1;
ALTER TABLE "TableOrder" ADD COLUMN "version" BIGINT NOT NULL DEFAULT 1;
ALTER TABLE "RestaurantTable" ADD COLUMN "version" BIGINT NOT NULL DEFAULT 1;
ALTER TABLE "ProductStock" ADD COLUMN "version" BIGINT NOT NULL DEFAULT 1;

CREATE TABLE "OperationEvent" (
  "id" BIGSERIAL NOT NULL,
  "type" TEXT NOT NULL,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT NOT NULL,
  "version" BIGINT NOT NULL,
  "related" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OperationEvent_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "OperationEvent_createdAt_idx" ON "OperationEvent"("createdAt");
CREATE INDEX "OperationEvent_entityType_entityId_idx" ON "OperationEvent"("entityType", "entityId");
