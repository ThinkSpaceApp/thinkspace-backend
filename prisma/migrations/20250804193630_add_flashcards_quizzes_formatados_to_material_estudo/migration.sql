/*
  Warnings:

  - You are about to drop the column `flashcardsJson` on the `MaterialEstudo` table. All the data in the column will be lost.
  - You are about to drop the column `quizzesJson` on the `MaterialEstudo` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "MaterialEstudo" DROP COLUMN "flashcardsJson",
DROP COLUMN "quizzesJson",
ADD COLUMN     "flashcardsFormatados" TEXT,
ADD COLUMN     "quizzesFormatados" TEXT;
