/*
  Warnings:

  - You are about to drop the column `titulo` on the `MaterialEstudo` table. All the data in the column will be lost.
  - Added the required column `materiaId` to the `MaterialEstudo` table without a default value. This is not possible if the table is not empty.
  - Added the required column `origem` to the `MaterialEstudo` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "OrigemMaterial" AS ENUM ('TOPICOS', 'DOCUMENTO', 'ASSUNTO');

-- DropForeignKey
ALTER TABLE "MaterialEstudo" DROP CONSTRAINT "MaterialEstudo_assuntoId_fkey";

-- AlterTable
ALTER TABLE "MaterialEstudo" DROP COLUMN "titulo",
ADD COLUMN     "materiaId" TEXT NOT NULL,
ADD COLUMN     "nomeDesignado" TEXT,
ADD COLUMN     "origem" "OrigemMaterial" NOT NULL,
ADD COLUMN     "topicos" TEXT[],
ALTER COLUMN "assuntoId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "MaterialEstudo" ADD CONSTRAINT "MaterialEstudo_materiaId_fkey" FOREIGN KEY ("materiaId") REFERENCES "materias"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialEstudo" ADD CONSTRAINT "MaterialEstudo_assuntoId_fkey" FOREIGN KEY ("assuntoId") REFERENCES "Assunto"("id") ON DELETE SET NULL ON UPDATE CASCADE;
