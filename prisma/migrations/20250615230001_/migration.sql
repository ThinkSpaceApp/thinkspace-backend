-- DropForeignKey
ALTER TABLE "SalaEstudo" DROP CONSTRAINT "SalaEstudo_assuntoId_fkey";

-- AlterTable
ALTER TABLE "SalaEstudo" ALTER COLUMN "assuntoId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "SalaEstudo" ADD CONSTRAINT "SalaEstudo_assuntoId_fkey" FOREIGN KEY ("assuntoId") REFERENCES "Assunto"("id") ON DELETE SET NULL ON UPDATE CASCADE;
