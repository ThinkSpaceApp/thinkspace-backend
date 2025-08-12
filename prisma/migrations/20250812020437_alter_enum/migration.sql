/*
  Warnings:

  - The values [MASTER] on the enum `NivelUsuario` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "NivelUsuario_new" AS ENUM ('INICIANTE', 'APRENDIZ', 'JUNIOR', 'AVANCADO', 'ESPECIALISTA', 'MENTOR', 'ELITE');
ALTER TABLE "ExperienciaUsuario" ALTER COLUMN "nivel" DROP DEFAULT;
ALTER TABLE "PerfilUsuario" ALTER COLUMN "nivel" DROP DEFAULT;
ALTER TABLE "PerfilUsuario" ALTER COLUMN "nivel" TYPE "NivelUsuario_new" USING ("nivel"::text::"NivelUsuario_new");
ALTER TABLE "ExperienciaUsuario" ALTER COLUMN "nivel" TYPE "NivelUsuario_new" USING ("nivel"::text::"NivelUsuario_new");
ALTER TYPE "NivelUsuario" RENAME TO "NivelUsuario_old";
ALTER TYPE "NivelUsuario_new" RENAME TO "NivelUsuario";
DROP TYPE "NivelUsuario_old";
ALTER TABLE "ExperienciaUsuario" ALTER COLUMN "nivel" SET DEFAULT 'INICIANTE';
ALTER TABLE "PerfilUsuario" ALTER COLUMN "nivel" SET DEFAULT 'INICIANTE';
COMMIT;
