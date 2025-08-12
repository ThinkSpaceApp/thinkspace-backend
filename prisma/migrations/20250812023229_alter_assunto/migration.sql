/*
  Warnings:

  - You are about to drop the column `assuntoId` on the `MaterialEstudo` table. All the data in the column will be lost.
  - You are about to drop the column `assuntoId` on the `SalaEstudo` table. All the data in the column will be lost.
  - You are about to drop the `Assunto` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "MaterialEstudo" DROP CONSTRAINT "MaterialEstudo_assuntoId_fkey";

-- DropForeignKey
ALTER TABLE "SalaEstudo" DROP CONSTRAINT "SalaEstudo_assuntoId_fkey";

-- AlterTable
ALTER TABLE "MaterialEstudo" DROP COLUMN "assuntoId",
ADD COLUMN     "assunto" TEXT;

-- AlterTable
ALTER TABLE "SalaEstudo" DROP COLUMN "assuntoId",
ADD COLUMN     "assunto" TEXT;

-- DropTable
DROP TABLE "Assunto";
