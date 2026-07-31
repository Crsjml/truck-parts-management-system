-- AlterEnum: add GCASH to PaymentMethod
ALTER TYPE "PaymentMethod" ADD VALUE 'GCASH';

-- AlterTable: add gcashReference to Transaction
ALTER TABLE "Transaction" ADD COLUMN "gcashReference" TEXT;
