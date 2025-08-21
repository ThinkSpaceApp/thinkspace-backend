-- AlterTable
ALTER TABLE "Usuario" ADD COLUMN     "dataSuspensao" TIMESTAMP(3),
ADD COLUMN     "suspenso" BOOLEAN NOT NULL DEFAULT false;
