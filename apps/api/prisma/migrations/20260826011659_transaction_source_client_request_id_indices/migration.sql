-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "TransactionSource" ADD VALUE 'SAVINGS';
ALTER TYPE "TransactionSource" ADD VALUE 'MCP';

-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "clientRequestId" TEXT;

-- CreateIndex
CREATE INDEX "Transaction_categoryId_idx" ON "Transaction"("categoryId");

-- CreateIndex
CREATE INDEX "Transaction_expenseTemplateId_idx" ON "Transaction"("expenseTemplateId");

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_userId_clientRequestId_key" ON "Transaction"("userId", "clientRequestId");
