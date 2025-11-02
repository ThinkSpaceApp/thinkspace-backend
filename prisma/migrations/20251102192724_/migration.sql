/*
  Warnings:

  - Added the required column `autorId` to the `SalaEstudoMaterial` table without a default value. This is not possible if the table is not empty.
  - Added the required column `materiaId` to the `SalaEstudoMaterial` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "SalaEstudoMaterial" ADD COLUMN     "autorId" TEXT NOT NULL,
ADD COLUMN     "avatarAutor" TEXT,
ADD COLUMN     "materiaId" TEXT NOT NULL,
ADD COLUMN     "tags" TEXT[];
