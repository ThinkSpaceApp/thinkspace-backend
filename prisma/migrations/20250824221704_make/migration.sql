-- AlterTable
ALTER TABLE "AtividadeUsuario" ADD COLUMN     "materialId" TEXT,
ADD COLUMN     "quizIndex" INTEGER;

-- AddForeignKey
ALTER TABLE "AtividadeUsuario" ADD CONSTRAINT "AtividadeUsuario_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "MaterialEstudo"("id") ON DELETE SET NULL ON UPDATE CASCADE;
