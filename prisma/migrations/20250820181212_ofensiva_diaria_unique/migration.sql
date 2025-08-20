/*
  Warnings:

  - A unique constraint covering the columns `[usuarioId,data]` on the table `AtividadeUsuario` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "AtividadeUsuario_usuarioId_data_key" ON "AtividadeUsuario"("usuarioId", "data");
