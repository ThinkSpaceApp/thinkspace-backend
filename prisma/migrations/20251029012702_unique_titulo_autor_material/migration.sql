/*
  Warnings:

  - A unique constraint covering the columns `[autorId,titulo]` on the table `MaterialEstudo` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "MaterialEstudo_autorId_titulo_key" ON "MaterialEstudo"("autorId", "titulo");
