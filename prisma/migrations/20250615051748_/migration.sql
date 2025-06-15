/*
  Warnings:

  - Added the required column `titulo` to the `MaterialEstudo` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "MaterialEstudo" ADD COLUMN     "titulo" TEXT NOT NULL;
