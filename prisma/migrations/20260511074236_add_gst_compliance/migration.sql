-- CreateEnum
CREATE TYPE "SupplyType" AS ENUM ('INTRA_STATE', 'INTER_STATE');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('TAX_INVOICE', 'BILL_OF_SUPPLY');

-- AlterTable
ALTER TABLE "Client" ADD COLUMN     "gstStateCode" TEXT,
ADD COLUMN     "gstStateName" TEXT,
ADD COLUMN     "gstin" TEXT,
ADD COLUMN     "isBusiness" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN     "buyerGstinSnapshot" TEXT,
ADD COLUMN     "buyerStateSnapshot" TEXT,
ADD COLUMN     "documentType" "DocumentType" NOT NULL DEFAULT 'TAX_INVOICE',
ADD COLUMN     "placeOfSupply" TEXT,
ADD COLUMN     "sellerGstinSnapshot" TEXT,
ADD COLUMN     "sellerStateSnapshot" TEXT,
ADD COLUMN     "supplyType" "SupplyType",
ADD COLUMN     "supplyTypeOverridden" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "InvoiceItem" ADD COLUMN     "cgstAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "gstRatePct" INTEGER NOT NULL DEFAULT 18,
ADD COLUMN     "igstAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "sgstAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "taxableValue" DECIMAL(10,2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "gstStateCode" TEXT,
ADD COLUMN     "gstStateName" TEXT,
ADD COLUMN     "gstin" TEXT;
