-- CreateTable
CREATE TABLE "AtividadeUsuario" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "data" TIMESTAMP(3) NOT NULL,
    "quantidade" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "AtividadeUsuario_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "AtividadeUsuario" ADD CONSTRAINT "AtividadeUsuario_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
