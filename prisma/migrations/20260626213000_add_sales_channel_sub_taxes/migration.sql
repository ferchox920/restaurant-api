CREATE TABLE "SalesChannelSubTax" (
    "id" UUID NOT NULL,
    "salesChannelId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "percentage" DECIMAL(5,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SalesChannelSubTax_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SalesChannelSubTax_salesChannelId_name_key" ON "SalesChannelSubTax"("salesChannelId", "name");
CREATE INDEX "SalesChannelSubTax_salesChannelId_idx" ON "SalesChannelSubTax"("salesChannelId");

ALTER TABLE "SalesChannelSubTax"
ADD CONSTRAINT "SalesChannelSubTax_salesChannelId_fkey" FOREIGN KEY ("salesChannelId") REFERENCES "SalesChannel"("id") ON DELETE CASCADE ON UPDATE CASCADE;
