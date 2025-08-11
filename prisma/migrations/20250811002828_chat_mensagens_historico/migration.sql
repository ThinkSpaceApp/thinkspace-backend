-- CreateTable
CREATE TABLE "ChatMensagem" (
    "id" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "autorId" TEXT NOT NULL,
    "mensagemUsuario" TEXT NOT NULL,
    "mensagemIa" TEXT NOT NULL,
    "horarioMensagem" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatMensagem_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ChatMensagem" ADD CONSTRAINT "ChatMensagem_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "MaterialEstudo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatMensagem" ADD CONSTRAINT "ChatMensagem_autorId_fkey" FOREIGN KEY ("autorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
