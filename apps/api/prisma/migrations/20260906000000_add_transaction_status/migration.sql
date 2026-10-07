-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('PENDING', 'CONFIRMED', 'SKIPPED');

-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN "status" "TransactionStatus" NOT NULL DEFAULT 'CONFIRMED';

-- AlterTable
ALTER TABLE "RecurringRule" ADD COLUMN "autoConfirm" BOOLEAN NOT NULL DEFAULT false;

-- Backfill: las ocurrencias recurrentes futuras ya materializadas y sin editar
-- pasan a PENDING (proyectadas). Todo lo demás queda CONFIRMED por el default.
-- CURRENT_DATE es UTC: puede errar +-1 día en la frontera según la zona del usuario.
UPDATE "Transaction"
SET "status" = 'PENDING'
WHERE "source" = 'RECURRING'
  AND "isModified" = false
  AND "date" > CURRENT_DATE;

-- DropIndex
DROP INDEX "Transaction_userId_date_idx";

-- DropIndex
DROP INDEX "Transaction_accountId_date_idx";

-- CreateIndex
CREATE INDEX "Transaction_userId_status_date_idx" ON "Transaction"("userId", "status", "date");

-- CreateIndex
CREATE INDEX "Transaction_accountId_status_date_idx" ON "Transaction"("accountId", "status", "date");
