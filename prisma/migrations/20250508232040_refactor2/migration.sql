/*
  Warnings:

  - Added the required column `codigoExpiracao` to the `usuarios` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "usuarios" ADD COLUMN     "codigoExpiracao" TIMESTAMP(3) NOT NULL;
