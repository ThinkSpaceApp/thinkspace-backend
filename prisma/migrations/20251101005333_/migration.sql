/*
  Warnings:

  - You are about to drop the column `postagemId` on the `Comentario` table. All the data in the column will be lost.
  - You are about to drop the column `postagemId` on the `Denuncia` table. All the data in the column will be lost.
  - You are about to drop the `PostagemComunidade` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `PostagemSalva` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `TopicoComunidade` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `postId` to the `Comentario` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Comentario" DROP CONSTRAINT "Comentario_postagemId_fkey";

-- DropForeignKey
ALTER TABLE "Denuncia" DROP CONSTRAINT "Denuncia_postagemId_fkey";

-- DropForeignKey
ALTER TABLE "PostagemComunidade" DROP CONSTRAINT "PostagemComunidade_autorId_fkey";

-- DropForeignKey
ALTER TABLE "PostagemComunidade" DROP CONSTRAINT "PostagemComunidade_topicoId_fkey";

-- DropForeignKey
ALTER TABLE "PostagemSalva" DROP CONSTRAINT "PostagemSalva_postagemId_fkey";

-- DropForeignKey
ALTER TABLE "PostagemSalva" DROP CONSTRAINT "PostagemSalva_usuarioId_fkey";

-- DropForeignKey
ALTER TABLE "TopicoComunidade" DROP CONSTRAINT "TopicoComunidade_salaId_fkey";

-- AlterTable
ALTER TABLE "Comentario" DROP COLUMN "postagemId",
ADD COLUMN     "postId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Denuncia" DROP COLUMN "postagemId",
ADD COLUMN     "postId" TEXT;

-- DropTable
DROP TABLE "PostagemComunidade";

-- DropTable
DROP TABLE "PostagemSalva";

-- DropTable
DROP TABLE "TopicoComunidade";

-- CreateTable
CREATE TABLE "PostSalvo" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PostSalvo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Post" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "conteudo" TEXT NOT NULL,
    "autorId" TEXT NOT NULL,
    "salaId" TEXT NOT NULL,
    "curtidas" INTEGER NOT NULL DEFAULT 0,
    "tags" TEXT[],
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Post_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PostSalvo_usuarioId_postId_key" ON "PostSalvo"("usuarioId", "postId");

-- AddForeignKey
ALTER TABLE "PostSalvo" ADD CONSTRAINT "PostSalvo_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostSalvo" ADD CONSTRAINT "PostSalvo_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_autorId_fkey" FOREIGN KEY ("autorId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_salaId_fkey" FOREIGN KEY ("salaId") REFERENCES "SalaEstudo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comentario" ADD CONSTRAINT "Comentario_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Denuncia" ADD CONSTRAINT "Denuncia_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE SET NULL ON UPDATE CASCADE;
