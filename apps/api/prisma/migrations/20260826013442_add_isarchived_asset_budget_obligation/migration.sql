-- AlterTable
ALTER TABLE "Asset" ADD COLUMN     "isArchived" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Budget" ADD COLUMN     "isArchived" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Obligation" ADD COLUMN     "isArchived" BOOLEAN NOT NULL DEFAULT false;
