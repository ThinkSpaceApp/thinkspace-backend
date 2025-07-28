/*
  Warnings:

  - The primary key for the `MembroSala` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `MembroSala` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "MembroSala" DROP CONSTRAINT "MembroSala_pkey",
DROP COLUMN "id",
ADD CONSTRAINT "MembroSala_pkey" PRIMARY KEY ("usuarioId", "salaId");
