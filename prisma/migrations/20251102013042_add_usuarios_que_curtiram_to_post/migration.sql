-- AlterTable
ALTER TABLE "Post" ADD COLUMN     "usuariosQueCurtiram" TEXT[] DEFAULT ARRAY[]::TEXT[];
