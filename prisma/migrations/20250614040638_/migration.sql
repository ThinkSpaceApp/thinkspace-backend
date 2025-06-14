/*
  Warnings:

  - The values [USUARIO] on the enum `Funcao` will be removed. If these variants are still used in the database, this will fail.

*/
-- CreateEnum
CREATE TYPE "NivelUsuario" AS ENUM ('INICIANTE', 'AVANCADO', 'MASTER');

-- AlterEnum
BEGIN;
CREATE TYPE "Funcao_new" AS ENUM ('ESTUDANTE', 'ADMINISTRADOR_GERAL');
ALTER TABLE "usuarios" ALTER COLUMN "funcao" DROP DEFAULT;
ALTER TABLE "usuarios" ALTER COLUMN "funcao" TYPE "Funcao_new" USING ("funcao"::text::"Funcao_new");
ALTER TYPE "Funcao" RENAME TO "Funcao_old";
ALTER TYPE "Funcao_new" RENAME TO "Funcao";
DROP TYPE "Funcao_old";
ALTER TABLE "usuarios" ALTER COLUMN "funcao" SET DEFAULT 'ESTUDANTE';
COMMIT;

-- AlterTable
ALTER TABLE "usuarios" ALTER COLUMN "funcao" SET DEFAULT 'ESTUDANTE';

-- CreateTable
CREATE TABLE "PerfilUsuario" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "avatar" TEXT NOT NULL DEFAULT 'https://ui-avatars.com/api/?name=User&background=8e44ad&color=fff',
    "xp" INTEGER NOT NULL DEFAULT 0,
    "nivel" "NivelUsuario" NOT NULL DEFAULT 'INICIANTE',
    "progresso" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "PerfilUsuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExperienciaUsuario" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "avatar" TEXT NOT NULL DEFAULT 'https://ui-avatars.com/api/?name=User&background=8e44ad&color=fff',
    "xp" INTEGER NOT NULL DEFAULT 0,
    "progresso" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "nivel" "NivelUsuario" NOT NULL DEFAULT 'INICIANTE',

    CONSTRAINT "ExperienciaUsuario_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PerfilUsuario_usuarioId_key" ON "PerfilUsuario"("usuarioId");

-- CreateIndex
CREATE UNIQUE INDEX "ExperienciaUsuario_usuarioId_key" ON "ExperienciaUsuario"("usuarioId");

-- AddForeignKey
ALTER TABLE "PerfilUsuario" ADD CONSTRAINT "PerfilUsuario_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExperienciaUsuario" ADD CONSTRAINT "ExperienciaUsuario_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
