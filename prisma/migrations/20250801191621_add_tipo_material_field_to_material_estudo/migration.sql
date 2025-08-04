/*
  Warnings:

  - Added the required column `tipoMaterial` to the `MaterialEstudo` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "TipoMaterialEstudo" AS ENUM ('QUIZZ', 'FLASHCARD', 'RESUMO_IA', 'COMPLETO');

-- AlterTable
ALTER TABLE "MaterialEstudo" ADD COLUMN     "tipoMaterial" "TipoMaterialEstudo" NOT NULL;
