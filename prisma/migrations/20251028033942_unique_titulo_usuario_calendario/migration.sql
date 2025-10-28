/*
  Warnings:

  - A unique constraint covering the columns `[usuarioId,titulo]` on the table `Calendario` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Calendario_usuarioId_titulo_key" ON "Calendario"("usuarioId", "titulo");
