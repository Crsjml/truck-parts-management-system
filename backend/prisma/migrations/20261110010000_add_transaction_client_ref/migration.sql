-- AlterTable: POS idempotency key; invoice numbers are now assigned server-side.
ALTER TABLE "Transaction" ADD COLUMN "clientRef" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_clientRef_key" ON "Transaction"("clientRef");
