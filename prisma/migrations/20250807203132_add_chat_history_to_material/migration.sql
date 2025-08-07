/*
  Warnings:

  - You are about to drop the column `chatHistoryJson` on the `MembroSala` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "MaterialEstudo" ADD COLUMN     "chatHistoryJson" JSONB;

-- AlterTable
ALTER TABLE "MembroSala" DROP COLUMN "chatHistoryJson";
