-- AlterTable
ALTER TABLE "OrderRow" ADD COLUMN "totalDiscounts" DECIMAL;
ALTER TABLE "OrderRow" ADD COLUMN "shippingMethod" TEXT;

-- AlterTable
ALTER TABLE "LineItemRow" ADD COLUMN "compareAtUnitPrice" DECIMAL;
ALTER TABLE "LineItemRow" ADD COLUMN "selectedOptionsJson" TEXT;

-- AlterTable
ALTER TABLE "ProductRow" ADD COLUMN "optionsJson" TEXT;
ALTER TABLE "ProductRow" ADD COLUMN "compareAtPrice" DECIMAL;
ALTER TABLE "ProductRow" ADD COLUMN "metafieldsJson" TEXT;
