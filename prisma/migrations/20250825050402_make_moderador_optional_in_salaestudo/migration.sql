-- DropForeignKey
ALTER TABLE "SalaEstudo" DROP CONSTRAINT "SalaEstudo_moderadorId_fkey";

-- AlterTable
ALTER TABLE "SalaEstudo" ALTER COLUMN "moderadorId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "SalaEstudo" ADD CONSTRAINT "SalaEstudo_moderadorId_fkey" FOREIGN KEY ("moderadorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
