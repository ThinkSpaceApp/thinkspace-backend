-- CreateTable
CREATE TABLE "Anotacao" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "subtitulo" TEXT,
    "data" TIMESTAMP(3) NOT NULL,
    "cor" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Anotacao_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Anotacao" ADD CONSTRAINT "Anotacao_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
