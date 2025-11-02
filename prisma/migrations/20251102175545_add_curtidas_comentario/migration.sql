-- AlterTable
ALTER TABLE "Comentario" ADD COLUMN     "curtidas" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "usuariosQueCurtiram" TEXT[] DEFAULT ARRAY[]::TEXT[];
