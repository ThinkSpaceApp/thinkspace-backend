/*
  Warnings:

  - The values [ESTUDANTE,MODERADOR,ADMIN] on the enum `Funcao` will be removed. If these variants are still used in the database, this will fail.

*/
-- CreateEnum
CREATE TYPE "CorMateria" AS ENUM ('SALMAO', 'ROSA', 'LILAS', 'ROXO');

-- AlterEnum
BEGIN;
CREATE TYPE "Funcao_new" AS ENUM ('USUARIO', 'ADMINISTRADOR_GERAL');
ALTER TABLE "usuarios" ALTER COLUMN "funcao" DROP DEFAULT;
ALTER TABLE "usuarios" ALTER COLUMN "funcao" TYPE "Funcao_new" USING ("funcao"::text::"Funcao_new");
ALTER TYPE "Funcao" RENAME TO "Funcao_old";
ALTER TYPE "Funcao_new" RENAME TO "Funcao";
DROP TYPE "Funcao_old";
ALTER TABLE "usuarios" ALTER COLUMN "funcao" SET DEFAULT 'USUARIO';
COMMIT;

-- AlterTable
ALTER TABLE "usuarios" ALTER COLUMN "funcao" SET DEFAULT 'USUARIO';

-- CreateTable
CREATE TABLE "materias" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "cor" "CorMateria" NOT NULL,
    "icone" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "tempoAtivo" INTEGER NOT NULL DEFAULT 0,
    "ultimaRevisao" TIMESTAMP(3),

    CONSTRAINT "materias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_MateriasMateriais" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_MateriasMateriais_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "materias_nome_usuarioId_key" ON "materias"("nome", "usuarioId");

-- CreateIndex
CREATE INDEX "_MateriasMateriais_B_index" ON "_MateriasMateriais"("B");

-- AddForeignKey
ALTER TABLE "materias" ADD CONSTRAINT "materias_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_MateriasMateriais" ADD CONSTRAINT "_MateriasMateriais_A_fkey" FOREIGN KEY ("A") REFERENCES "materias"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_MateriasMateriais" ADD CONSTRAINT "_MateriasMateriais_B_fkey" FOREIGN KEY ("B") REFERENCES "MaterialEstudo"("id") ON DELETE CASCADE ON UPDATE CASCADE;
