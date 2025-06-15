/*
  Warnings:

  - You are about to drop the `_MateriasMateriais` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `materias` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `notificacoes` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `usuarios` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Calendario" DROP CONSTRAINT "Calendario_usuarioId_fkey";

-- DropForeignKey
ALTER TABLE "Comentario" DROP CONSTRAINT "Comentario_autorId_fkey";

-- DropForeignKey
ALTER TABLE "Denuncia" DROP CONSTRAINT "Denuncia_denuncianteId_fkey";

-- DropForeignKey
ALTER TABLE "ExperienciaUsuario" DROP CONSTRAINT "ExperienciaUsuario_usuarioId_fkey";

-- DropForeignKey
ALTER TABLE "MaterialEstudo" DROP CONSTRAINT "MaterialEstudo_autorId_fkey";

-- DropForeignKey
ALTER TABLE "MaterialEstudo" DROP CONSTRAINT "MaterialEstudo_materiaId_fkey";

-- DropForeignKey
ALTER TABLE "MembroSala" DROP CONSTRAINT "MembroSala_usuarioId_fkey";

-- DropForeignKey
ALTER TABLE "MetricasUsuario" DROP CONSTRAINT "MetricasUsuario_usuarioId_fkey";

-- DropForeignKey
ALTER TABLE "PerfilUsuario" DROP CONSTRAINT "PerfilUsuario_usuarioId_fkey";

-- DropForeignKey
ALTER TABLE "PostagemComunidade" DROP CONSTRAINT "PostagemComunidade_autorId_fkey";

-- DropForeignKey
ALTER TABLE "PostagemSalva" DROP CONSTRAINT "PostagemSalva_usuarioId_fkey";

-- DropForeignKey
ALTER TABLE "Revisao" DROP CONSTRAINT "Revisao_usuarioId_fkey";

-- DropForeignKey
ALTER TABLE "SalaEstudo" DROP CONSTRAINT "SalaEstudo_moderadorId_fkey";

-- DropForeignKey
ALTER TABLE "VerificacaoEmail" DROP CONSTRAINT "VerificacaoEmail_usuarioId_fkey";

-- DropForeignKey
ALTER TABLE "_MateriasMateriais" DROP CONSTRAINT "_MateriasMateriais_A_fkey";

-- DropForeignKey
ALTER TABLE "_MateriasMateriais" DROP CONSTRAINT "_MateriasMateriais_B_fkey";

-- DropForeignKey
ALTER TABLE "materias" DROP CONSTRAINT "materias_usuarioId_fkey";

-- DropForeignKey
ALTER TABLE "notificacoes" DROP CONSTRAINT "notificacoes_usuarioId_fkey";

-- DropForeignKey
ALTER TABLE "usuarios" DROP CONSTRAINT "usuarios_instituicaoId_fkey";

-- DropTable
DROP TABLE "_MateriasMateriais";

-- DropTable
DROP TABLE "materias";

-- DropTable
DROP TABLE "notificacoes";

-- DropTable
DROP TABLE "usuarios";

-- CreateTable
CREATE TABLE "Notificacoes" (
    "id" TEXT NOT NULL,
    "mensagem" TEXT NOT NULL,
    "lida" BOOLEAN NOT NULL DEFAULT false,
    "data" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usuarioId" TEXT NOT NULL,

    CONSTRAINT "Notificacoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Usuario" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "dataNascimento" TIMESTAMP(3) NOT NULL,
    "senha" TEXT NOT NULL,
    "primeiroNome" TEXT NOT NULL,
    "sobrenome" TEXT NOT NULL,
    "nomeCompleto" TEXT,
    "emailVerificado" BOOLEAN NOT NULL DEFAULT false,
    "codigoVerificado" TEXT NOT NULL,
    "codigoExpiracao" TIMESTAMP(3) NOT NULL,
    "funcao" "Funcao" NOT NULL DEFAULT 'ESTUDANTE',
    "foto" TEXT DEFAULT 'https://ui-avatars.com/api/?name=User&background=8e44ad&color=fff',
    "instituicaoId" TEXT,
    "escolaridade" "NivelEscolaridade",
    "areaDeInteresse" TEXT,
    "objetivoNaPlataforma" "ObjetivoPlataforma" DEFAULT 'OUTRO',
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,
    "ultimoLogin" TIMESTAMP(3),

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Materia" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "cor" "CorMateria" NOT NULL,
    "icone" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,

    CONSTRAINT "Materia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_MateriaParaMaterial" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_MateriaParaMaterial_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_codigoVerificado_key" ON "Usuario"("codigoVerificado");

-- CreateIndex
CREATE INDEX "_MateriaParaMaterial_B_index" ON "_MateriaParaMaterial"("B");

-- AddForeignKey
ALTER TABLE "Notificacoes" ADD CONSTRAINT "Notificacoes_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Usuario" ADD CONSTRAINT "Usuario_instituicaoId_fkey" FOREIGN KEY ("instituicaoId") REFERENCES "Instituicao"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VerificacaoEmail" ADD CONSTRAINT "VerificacaoEmail_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialEstudo" ADD CONSTRAINT "MaterialEstudo_materiaId_fkey" FOREIGN KEY ("materiaId") REFERENCES "Materia"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialEstudo" ADD CONSTRAINT "MaterialEstudo_autorId_fkey" FOREIGN KEY ("autorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalaEstudo" ADD CONSTRAINT "SalaEstudo_moderadorId_fkey" FOREIGN KEY ("moderadorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MembroSala" ADD CONSTRAINT "MembroSala_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostagemComunidade" ADD CONSTRAINT "PostagemComunidade_autorId_fkey" FOREIGN KEY ("autorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comentario" ADD CONSTRAINT "Comentario_autorId_fkey" FOREIGN KEY ("autorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Denuncia" ADD CONSTRAINT "Denuncia_denuncianteId_fkey" FOREIGN KEY ("denuncianteId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MetricasUsuario" ADD CONSTRAINT "MetricasUsuario_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostagemSalva" ADD CONSTRAINT "PostagemSalva_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Revisao" ADD CONSTRAINT "Revisao_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Calendario" ADD CONSTRAINT "Calendario_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Materia" ADD CONSTRAINT "Materia_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PerfilUsuario" ADD CONSTRAINT "PerfilUsuario_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExperienciaUsuario" ADD CONSTRAINT "ExperienciaUsuario_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_MateriaParaMaterial" ADD CONSTRAINT "_MateriaParaMaterial_A_fkey" FOREIGN KEY ("A") REFERENCES "Materia"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_MateriaParaMaterial" ADD CONSTRAINT "_MateriaParaMaterial_B_fkey" FOREIGN KEY ("B") REFERENCES "MaterialEstudo"("id") ON DELETE CASCADE ON UPDATE CASCADE;
