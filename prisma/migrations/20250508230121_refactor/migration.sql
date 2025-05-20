/*
  Warnings:

  - You are about to drop the `Usuario` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "ObjetivoPlataforma" AS ENUM ('PREPARACAO_PARA_VESTIBULAR', 'APRENDIZADO_CONTINUO', 'PREFIRO_NAO_INFORMAR', 'REFORÇO_ESCOLAR', 'OUTRO');

-- DropForeignKey
ALTER TABLE "Calendario" DROP CONSTRAINT "Calendario_usuarioId_fkey";

-- DropForeignKey
ALTER TABLE "Comentario" DROP CONSTRAINT "Comentario_autorId_fkey";

-- DropForeignKey
ALTER TABLE "Denuncia" DROP CONSTRAINT "Denuncia_denuncianteId_fkey";

-- DropForeignKey
ALTER TABLE "MaterialEstudo" DROP CONSTRAINT "MaterialEstudo_autorId_fkey";

-- DropForeignKey
ALTER TABLE "MembroSala" DROP CONSTRAINT "MembroSala_usuarioId_fkey";

-- DropForeignKey
ALTER TABLE "MetricasUsuario" DROP CONSTRAINT "MetricasUsuario_usuarioId_fkey";

-- DropForeignKey
ALTER TABLE "PostagemComunidade" DROP CONSTRAINT "PostagemComunidade_autorId_fkey";

-- DropForeignKey
ALTER TABLE "PostagemSalva" DROP CONSTRAINT "PostagemSalva_usuarioId_fkey";

-- DropForeignKey
ALTER TABLE "Revisao" DROP CONSTRAINT "Revisao_usuarioId_fkey";

-- DropForeignKey
ALTER TABLE "SalaEstudo" DROP CONSTRAINT "SalaEstudo_moderadorId_fkey";

-- DropForeignKey
ALTER TABLE "Usuario" DROP CONSTRAINT "Usuario_instituicaoId_fkey";

-- DropTable
DROP TABLE "Usuario";

-- CreateTable
CREATE TABLE "usuarios" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "dataNascimento" TIMESTAMP(3) NOT NULL,
    "senha" TEXT NOT NULL,
    "primeiroNome" TEXT NOT NULL,
    "sobrenome" TEXT NOT NULL,
    "nomeCompleto" TEXT,
    "emailVerificado" BOOLEAN NOT NULL DEFAULT false,
    "codigoVerificado" TEXT NOT NULL,
    "funcao" "Funcao" NOT NULL DEFAULT 'ESTUDANTE',
    "instituicaoId" TEXT,
    "escolaridade" "NivelEscolaridade",
    "areaDeInteresse" TEXT,
    "objetivoNaPlataforma" "ObjetivoPlataforma" DEFAULT 'OUTRO',
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificacaoEmail" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "expiraEm" TIMESTAMP(3) NOT NULL,
    "usuarioId" TEXT NOT NULL,

    CONSTRAINT "VerificacaoEmail_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TokenAdmin" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "usado" BOOLEAN NOT NULL DEFAULT false,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TokenAdmin_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_codigoVerificado_key" ON "usuarios"("codigoVerificado");

-- CreateIndex
CREATE UNIQUE INDEX "VerificacaoEmail_usuarioId_key" ON "VerificacaoEmail"("usuarioId");

-- CreateIndex
CREATE UNIQUE INDEX "TokenAdmin_token_key" ON "TokenAdmin"("token");

-- AddForeignKey
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_instituicaoId_fkey" FOREIGN KEY ("instituicaoId") REFERENCES "Instituicao"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VerificacaoEmail" ADD CONSTRAINT "VerificacaoEmail_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialEstudo" ADD CONSTRAINT "MaterialEstudo_autorId_fkey" FOREIGN KEY ("autorId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalaEstudo" ADD CONSTRAINT "SalaEstudo_moderadorId_fkey" FOREIGN KEY ("moderadorId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MembroSala" ADD CONSTRAINT "MembroSala_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostagemComunidade" ADD CONSTRAINT "PostagemComunidade_autorId_fkey" FOREIGN KEY ("autorId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comentario" ADD CONSTRAINT "Comentario_autorId_fkey" FOREIGN KEY ("autorId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Denuncia" ADD CONSTRAINT "Denuncia_denuncianteId_fkey" FOREIGN KEY ("denuncianteId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MetricasUsuario" ADD CONSTRAINT "MetricasUsuario_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostagemSalva" ADD CONSTRAINT "PostagemSalva_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Revisao" ADD CONSTRAINT "Revisao_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Calendario" ADD CONSTRAINT "Calendario_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
