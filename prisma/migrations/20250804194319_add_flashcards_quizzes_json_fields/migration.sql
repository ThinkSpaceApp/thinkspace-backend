/*
  Warnings:

  - You are about to drop the column `flashcardsFormatados` on the `MaterialEstudo` table. All the data in the column will be lost.
  - You are about to drop the column `quizzesFormatados` on the `MaterialEstudo` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "MaterialEstudo" DROP COLUMN "flashcardsFormatados",
DROP COLUMN "quizzesFormatados",
ADD COLUMN     "flashcardsJson" TEXT,
ADD COLUMN     "quizzesJson" TEXT;
