/*
  Warnings:

  - You are about to drop the column `answer` on the `Flashcard` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `Flashcard` table. All the data in the column will be lost.
  - You are about to drop the column `question` on the `Flashcard` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `Quiz` table. All the data in the column will be lost.
  - You are about to drop the column `questions` on the `Quiz` table. All the data in the column will be lost.
  - You are about to drop the `Activity` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Comment` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `CommunityPost` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Institution` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Report` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `StudyMaterial` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `StudyRoom` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `StudyRoomMember` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `User` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `UserMetrics` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `_StudyMaterialToStudyRoom` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `pergunta` to the `Flashcard` table without a default value. This is not possible if the table is not empty.
  - Added the required column `resposta` to the `Flashcard` table without a default value. This is not possible if the table is not empty.
  - Added the required column `perguntas` to the `Quiz` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "NivelEscolaridade" AS ENUM ('FUNDAMENTAL_INCOMPLETO', 'FUNDAMENTAL_COMPLETO', 'MEDIO_INCOMPLETO', 'MEDIO_COMPLETO', 'SUPERIOR_INCOMPLETO', 'SUPERIOR_COMPLETO', 'POS_GRADUACAO', 'MESTRADO', 'DOUTORADO', 'PREFIRO_NAO_INFORMAR');

-- CreateEnum
CREATE TYPE "TipoAtividade" AS ENUM ('FLASHCARDS', 'RESUMOS', 'QUESTOES', 'OUTRO');

-- CreateEnum
CREATE TYPE "Funcao" AS ENUM ('ESTUDANTE', 'MODERADOR', 'ADMIN');

-- CreateEnum
CREATE TYPE "FuncaoSalaEstudo" AS ENUM ('MEMBRO', 'MODERADOR');

-- CreateEnum
CREATE TYPE "TipoMaterial" AS ENUM ('PDF', 'TOPICO');

-- DropForeignKey
ALTER TABLE "Activity" DROP CONSTRAINT "Activity_studyRoomId_fkey";

-- DropForeignKey
ALTER TABLE "Comment" DROP CONSTRAINT "Comment_authorId_fkey";

-- DropForeignKey
ALTER TABLE "Comment" DROP CONSTRAINT "Comment_postId_fkey";

-- DropForeignKey
ALTER TABLE "CommunityPost" DROP CONSTRAINT "CommunityPost_authorId_fkey";

-- DropForeignKey
ALTER TABLE "Flashcard" DROP CONSTRAINT "Flashcard_materialId_fkey";

-- DropForeignKey
ALTER TABLE "Quiz" DROP CONSTRAINT "Quiz_materialId_fkey";

-- DropForeignKey
ALTER TABLE "Report" DROP CONSTRAINT "Report_commentId_fkey";

-- DropForeignKey
ALTER TABLE "Report" DROP CONSTRAINT "Report_postId_fkey";

-- DropForeignKey
ALTER TABLE "Report" DROP CONSTRAINT "Report_reporterId_fkey";

-- DropForeignKey
ALTER TABLE "StudyMaterial" DROP CONSTRAINT "StudyMaterial_authorId_fkey";

-- DropForeignKey
ALTER TABLE "StudyMaterial" DROP CONSTRAINT "StudyMaterial_topicId_fkey";

-- DropForeignKey
ALTER TABLE "StudyRoom" DROP CONSTRAINT "StudyRoom_modId_fkey";

-- DropForeignKey
ALTER TABLE "StudyRoomMember" DROP CONSTRAINT "StudyRoomMember_studyRoomId_fkey";

-- DropForeignKey
ALTER TABLE "StudyRoomMember" DROP CONSTRAINT "StudyRoomMember_userId_fkey";

-- DropForeignKey
ALTER TABLE "User" DROP CONSTRAINT "User_institutionId_fkey";

-- DropForeignKey
ALTER TABLE "UserMetrics" DROP CONSTRAINT "UserMetrics_userId_fkey";

-- DropForeignKey
ALTER TABLE "_StudyMaterialToStudyRoom" DROP CONSTRAINT "_StudyMaterialToStudyRoom_A_fkey";

-- DropForeignKey
ALTER TABLE "_StudyMaterialToStudyRoom" DROP CONSTRAINT "_StudyMaterialToStudyRoom_B_fkey";

-- AlterTable
ALTER TABLE "Flashcard" DROP COLUMN "answer",
DROP COLUMN "createdAt",
DROP COLUMN "question",
ADD COLUMN     "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "pergunta" TEXT NOT NULL,
ADD COLUMN     "resposta" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Quiz" DROP COLUMN "createdAt",
DROP COLUMN "questions",
ADD COLUMN     "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "perguntas" JSONB NOT NULL;

-- DropTable
DROP TABLE "Activity";

-- DropTable
DROP TABLE "Comment";

-- DropTable
DROP TABLE "CommunityPost";

-- DropTable
DROP TABLE "Institution";

-- DropTable
DROP TABLE "Report";

-- DropTable
DROP TABLE "StudyMaterial";

-- DropTable
DROP TABLE "StudyRoom";

-- DropTable
DROP TABLE "StudyRoomMember";

-- DropTable
DROP TABLE "User";

-- DropTable
DROP TABLE "UserMetrics";

-- DropTable
DROP TABLE "_StudyMaterialToStudyRoom";

-- DropEnum
DROP TYPE "ActivityType";

-- DropEnum
DROP TYPE "MaterialType";

-- DropEnum
DROP TYPE "Role";

-- DropEnum
DROP TYPE "SchoolingLevel";

-- DropEnum
DROP TYPE "StudyRoomRole";

-- CreateTable
CREATE TABLE "Usuario" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "dataNascimento" TIMESTAMP(3) NOT NULL,
    "senha" TEXT NOT NULL,
    "nomeCompleto" TEXT NOT NULL,
    "funcao" "Funcao" NOT NULL DEFAULT 'ESTUDANTE',
    "instituicaoId" TEXT,
    "escolaridade" "NivelEscolaridade",
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Assunto" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Assunto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaterialEstudo" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "tipo" "TipoMaterial" NOT NULL,
    "caminhoArquivo" TEXT,
    "conteudo" TEXT,
    "assuntoId" TEXT NOT NULL,
    "autorId" TEXT NOT NULL,
    "resumoIA" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MaterialEstudo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalaEstudo" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "moderadorId" TEXT NOT NULL,
    "assuntoId" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SalaEstudo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MembroSala" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "salaId" TEXT NOT NULL,
    "funcao" "FuncaoSalaEstudo" NOT NULL DEFAULT 'MEMBRO',
    "ingressouEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MembroSala_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Instituicao" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Instituicao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Atividade" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "tipo" "TipoAtividade" NOT NULL,
    "dataEntrega" TIMESTAMP(3),
    "salaId" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Atividade_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TopicoComunidade" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "salaId" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TopicoComunidade_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PostagemComunidade" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "conteudo" TEXT NOT NULL,
    "autorId" TEXT NOT NULL,
    "topicoId" TEXT NOT NULL,
    "curtidas" INTEGER NOT NULL DEFAULT 0,
    "tags" TEXT[],
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PostagemComunidade_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Comentario" (
    "id" TEXT NOT NULL,
    "conteudo" TEXT NOT NULL,
    "postagemId" TEXT NOT NULL,
    "autorId" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Comentario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Denuncia" (
    "id" TEXT NOT NULL,
    "motivo" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDENTE',
    "denuncianteId" TEXT NOT NULL,
    "postagemId" TEXT,
    "comentarioId" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Denuncia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MetricasUsuario" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "metaSemanal" INTEGER,
    "horasEstudadas" INTEGER NOT NULL DEFAULT 0,
    "conquistas" TEXT[],
    "progresso" JSONB NOT NULL,
    "ultimaAtividade" TIMESTAMP(3) NOT NULL,
    "sequenciaAtual" INTEGER NOT NULL DEFAULT 0,
    "maiorSequencia" INTEGER NOT NULL DEFAULT 0,
    "experienciaTotal" INTEGER NOT NULL DEFAULT 0,
    "experienciaPorAcertos" INTEGER NOT NULL DEFAULT 0,
    "ultimaRevisao" TIMESTAMP(3),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MetricasUsuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalaEstudoMaterial" (
    "materialId" TEXT NOT NULL,
    "salaId" TEXT NOT NULL,
    "atribuidoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SalaEstudoMaterial_pkey" PRIMARY KEY ("materialId","salaId")
);

-- CreateTable
CREATE TABLE "PostagemSalva" (
    "usuarioId" TEXT NOT NULL,
    "postagemId" TEXT NOT NULL,
    "salvoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PostagemSalva_pkey" PRIMARY KEY ("usuarioId","postagemId")
);

-- CreateTable
CREATE TABLE "Revisao" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "acertos" INTEGER NOT NULL,
    "experiencia" INTEGER NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Revisao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Calendario" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "descricao" TEXT,
    "dataInicio" TIMESTAMP(3) NOT NULL,
    "dataFim" TIMESTAMP(3),
    "tipo" "TipoAtividade" NOT NULL DEFAULT 'OUTRO',
    "recorrente" BOOLEAN NOT NULL DEFAULT false,
    "intervaloDias" INTEGER,
    "dataTerminoRecorrencia" TIMESTAMP(3),
    "usuarioId" TEXT,
    "salaId" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Calendario_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Assunto_nome_key" ON "Assunto"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "Instituicao_nome_key" ON "Instituicao"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "MetricasUsuario_usuarioId_key" ON "MetricasUsuario"("usuarioId");

-- CreateIndex
CREATE INDEX "Calendario_dataInicio_idx" ON "Calendario"("dataInicio");

-- AddForeignKey
ALTER TABLE "Usuario" ADD CONSTRAINT "Usuario_instituicaoId_fkey" FOREIGN KEY ("instituicaoId") REFERENCES "Instituicao"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialEstudo" ADD CONSTRAINT "MaterialEstudo_assuntoId_fkey" FOREIGN KEY ("assuntoId") REFERENCES "Assunto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialEstudo" ADD CONSTRAINT "MaterialEstudo_autorId_fkey" FOREIGN KEY ("autorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Flashcard" ADD CONSTRAINT "Flashcard_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "MaterialEstudo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quiz" ADD CONSTRAINT "Quiz_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "MaterialEstudo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalaEstudo" ADD CONSTRAINT "SalaEstudo_moderadorId_fkey" FOREIGN KEY ("moderadorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalaEstudo" ADD CONSTRAINT "SalaEstudo_assuntoId_fkey" FOREIGN KEY ("assuntoId") REFERENCES "Assunto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MembroSala" ADD CONSTRAINT "MembroSala_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MembroSala" ADD CONSTRAINT "MembroSala_salaId_fkey" FOREIGN KEY ("salaId") REFERENCES "SalaEstudo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Atividade" ADD CONSTRAINT "Atividade_salaId_fkey" FOREIGN KEY ("salaId") REFERENCES "SalaEstudo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TopicoComunidade" ADD CONSTRAINT "TopicoComunidade_salaId_fkey" FOREIGN KEY ("salaId") REFERENCES "SalaEstudo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostagemComunidade" ADD CONSTRAINT "PostagemComunidade_autorId_fkey" FOREIGN KEY ("autorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostagemComunidade" ADD CONSTRAINT "PostagemComunidade_topicoId_fkey" FOREIGN KEY ("topicoId") REFERENCES "TopicoComunidade"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comentario" ADD CONSTRAINT "Comentario_postagemId_fkey" FOREIGN KEY ("postagemId") REFERENCES "PostagemComunidade"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comentario" ADD CONSTRAINT "Comentario_autorId_fkey" FOREIGN KEY ("autorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Denuncia" ADD CONSTRAINT "Denuncia_denuncianteId_fkey" FOREIGN KEY ("denuncianteId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Denuncia" ADD CONSTRAINT "Denuncia_postagemId_fkey" FOREIGN KEY ("postagemId") REFERENCES "PostagemComunidade"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Denuncia" ADD CONSTRAINT "Denuncia_comentarioId_fkey" FOREIGN KEY ("comentarioId") REFERENCES "Comentario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MetricasUsuario" ADD CONSTRAINT "MetricasUsuario_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalaEstudoMaterial" ADD CONSTRAINT "SalaEstudoMaterial_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "MaterialEstudo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalaEstudoMaterial" ADD CONSTRAINT "SalaEstudoMaterial_salaId_fkey" FOREIGN KEY ("salaId") REFERENCES "SalaEstudo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostagemSalva" ADD CONSTRAINT "PostagemSalva_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostagemSalva" ADD CONSTRAINT "PostagemSalva_postagemId_fkey" FOREIGN KEY ("postagemId") REFERENCES "PostagemComunidade"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Revisao" ADD CONSTRAINT "Revisao_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Revisao" ADD CONSTRAINT "Revisao_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "MaterialEstudo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Calendario" ADD CONSTRAINT "Calendario_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Calendario" ADD CONSTRAINT "Calendario_salaId_fkey" FOREIGN KEY ("salaId") REFERENCES "SalaEstudo"("id") ON DELETE SET NULL ON UPDATE CASCADE;
