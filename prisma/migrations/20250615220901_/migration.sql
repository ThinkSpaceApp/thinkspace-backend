/*
  Warnings:

  - You are about to drop the column `tipo` on the `MaterialEstudo` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "MaterialEstudo" DROP COLUMN "tipo";

-- DropEnum
DROP TYPE "TipoMaterial";
