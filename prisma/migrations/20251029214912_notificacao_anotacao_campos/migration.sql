/*
  Warnings:

  - You are about to drop the `Anotacao` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Anotacao" DROP CONSTRAINT "Anotacao_usuarioId_fkey";

-- AlterTable
ALTER TABLE "Notificacoes" ADD COLUMN     "cor" TEXT,
ADD COLUMN     "dataAnotacao" TIMESTAMP(3),
ADD COLUMN     "subtitulo" TEXT,
ADD COLUMN     "titulo" TEXT;

-- DropTable
DROP TABLE "Anotacao";
