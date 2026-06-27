-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "systemProductId" TEXT;

-- CreateTable
CREATE TABLE "SystemProduct" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "brand" TEXT,
    "categoryName" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "commonPackageSize" DOUBLE PRECISION NOT NULL,
    "defaultDurationDays" INTEGER NOT NULL,
    "tags" TEXT[],

    CONSTRAINT "SystemProduct_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SystemProduct_name_idx" ON "SystemProduct"("name");

-- CreateIndex
CREATE INDEX "SystemProduct_categoryName_idx" ON "SystemProduct"("categoryName");

-- CreateIndex
CREATE UNIQUE INDEX "SystemProduct_name_categoryName_key" ON "SystemProduct"("name", "categoryName");

-- CreateIndex
CREATE INDEX "Product_systemProductId_idx" ON "Product"("systemProductId");

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_systemProductId_fkey" FOREIGN KEY ("systemProductId") REFERENCES "SystemProduct"("id") ON DELETE SET NULL ON UPDATE CASCADE;
