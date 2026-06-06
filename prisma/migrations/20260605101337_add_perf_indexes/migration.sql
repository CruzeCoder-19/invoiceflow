-- CreateIndex
CREATE INDEX "Client_userId_idx" ON "Client"("userId");

-- CreateIndex
CREATE INDEX "Client_gstin_idx" ON "Client"("gstin");

-- CreateIndex
CREATE INDEX "Invoice_userId_status_idx" ON "Invoice"("userId", "status");

-- CreateIndex
CREATE INDEX "Invoice_supplyType_idx" ON "Invoice"("supplyType");

-- CreateIndex
CREATE INDEX "Invoice_documentType_idx" ON "Invoice"("documentType");

-- CreateIndex
CREATE INDEX "InvoiceItem_invoiceId_idx" ON "InvoiceItem"("invoiceId");

-- CreateIndex
CREATE INDEX "User_gstin_idx" ON "User"("gstin");

-- CreateIndex
CREATE INDEX "User_pan_idx" ON "User"("pan");
