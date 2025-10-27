/*
  Warnings:

  - Made the column `moderadorId` on table `SalaEstudo` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "SalaEstudo" DROP CONSTRAINT "SalaEstudo_moderadorId_fkey";

-- AlterTable
ALTER TABLE "Calendario" ADD COLUMN     "materiaId" TEXT;

-- AlterTable
ALTER TABLE "SalaEstudo" ALTER COLUMN "moderadorId" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "SalaEstudo" ADD CONSTRAINT "SalaEstudo_moderadorId_fkey" FOREIGN KEY ("moderadorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Calendario" ADD CONSTRAINT "Calendario_materiaId_fkey" FOREIGN KEY ("materiaId") REFERENCES "Materia"("id") ON DELETE SET NULL ON UPDATE CASCADE;
