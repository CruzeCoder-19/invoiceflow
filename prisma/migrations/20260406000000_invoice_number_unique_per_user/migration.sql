-- DropIndex
DROP INDEX "Invoice_invoiceNumber_key";

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_userId_invoiceNumber_key" ON "Invoice"("userId", "invoiceNumber");
