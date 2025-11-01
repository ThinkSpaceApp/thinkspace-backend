-- CreateEnum
CREATE TYPE "TipoSalaEstudo" AS ENUM ('PUBLICA', 'PRIVADA');

-- AlterTable
ALTER TABLE "SalaEstudo" ADD COLUMN     "tipo" "TipoSalaEstudo" NOT NULL DEFAULT 'PUBLICA';

-- AlterTable
ALTER TABLE "Usuario" ADD COLUMN     "ultimasSalasAcessadas" TEXT[];
