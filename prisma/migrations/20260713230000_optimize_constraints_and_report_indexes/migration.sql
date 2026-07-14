-- Prevent concurrent writes from leaving more than one active history row.
CREATE UNIQUE INDEX "ProductCostHistory_one_current_cost_per_product_idx"
ON "ProductCostHistory" ("productId")
WHERE "validTo" IS NULL;

CREATE UNIQUE INDEX "ProductPriceHistory_one_current_price_per_channel_idx"
ON "ProductPriceHistory" ("productId", "salesChannelId")
WHERE "validTo" IS NULL;

-- Support the filters used by operational reports.
CREATE INDEX "SaleTicket_confirmedAt_idx" ON "SaleTicket" ("confirmedAt");
CREATE INDEX "SaleTicket_status_confirmedAt_idx"
ON "SaleTicket" ("status", "confirmedAt");
CREATE INDEX "SaleTicket_salesChannelId_status_confirmedAt_idx"
ON "SaleTicket" ("salesChannelId", "status", "confirmedAt");
CREATE INDEX "InventoryMovement_referenceType_createdAt_idx"
ON "InventoryMovement" ("referenceType", "createdAt");
CREATE INDEX "InventoryMovement_createdById_createdAt_idx"
ON "InventoryMovement" ("createdById", "createdAt");

-- These unique indexes already cover lookups by the same leading column.
DROP INDEX IF EXISTS "RestaurantTable_code_idx";
DROP INDEX IF EXISTS "TableOrder_saleTicketId_idx";

-- Accelerate case-insensitive contains searches (ILIKE '%term%').
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX "Product_name_trgm_idx"
ON "Product" USING GIN (LOWER("name") gin_trgm_ops);
CREATE INDEX "Product_sku_trgm_idx"
ON "Product" USING GIN (LOWER("sku") gin_trgm_ops);
CREATE INDEX "SaleTicket_notes_trgm_idx"
ON "SaleTicket" USING GIN (LOWER("notes") gin_trgm_ops);
CREATE INDEX "RestaurantTable_code_trgm_idx"
ON "RestaurantTable" USING GIN (LOWER("code") gin_trgm_ops);
CREATE INDEX "RestaurantTable_name_trgm_idx"
ON "RestaurantTable" USING GIN (LOWER("name") gin_trgm_ops);
CREATE INDEX "RestaurantTable_area_trgm_idx"
ON "RestaurantTable" USING GIN (LOWER("area") gin_trgm_ops);
