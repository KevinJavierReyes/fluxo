-- CreateEnum
CREATE TYPE "McpCallStatus" AS ENUM ('OK', 'ERROR', 'DENIED');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "mcpAllowConfigWrite" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "mcpAllowDelete" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "mcpMaxTransactionAmount" DECIMAL(14,2);

-- CreateTable
CREATE TABLE "McpAuditLog" (
    "id" TEXT NOT NULL,
    "userId" UUID NOT NULL,
    "tokenId" TEXT,
    "clientName" TEXT,
    "tool" TEXT NOT NULL,
    "argsRedacted" JSONB,
    "status" "McpCallStatus" NOT NULL,
    "errorCode" TEXT,
    "entityType" TEXT,
    "entityId" TEXT,
    "clientRequestId" TEXT,
    "undoneAt" TIMESTAMP(3),
    "durationMs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "McpAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "McpAuditLog_userId_createdAt_idx" ON "McpAuditLog"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "McpAuditLog_tokenId_createdAt_idx" ON "McpAuditLog"("tokenId", "createdAt");

-- AddForeignKey
ALTER TABLE "McpAuditLog" ADD CONSTRAINT "McpAuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

