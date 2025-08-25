-- DropForeignKey
ALTER TABLE "Comentario" DROP CONSTRAINT "Comentario_autorId_fkey";

-- DropForeignKey
ALTER TABLE "Denuncia" DROP CONSTRAINT "Denuncia_denuncianteId_fkey";

-- DropForeignKey
ALTER TABLE "MetricasUsuario" DROP CONSTRAINT "MetricasUsuario_usuarioId_fkey";

-- DropForeignKey
ALTER TABLE "Notificacoes" DROP CONSTRAINT "Notificacoes_usuarioId_fkey";

-- DropForeignKey
ALTER TABLE "PostagemComunidade" DROP CONSTRAINT "PostagemComunidade_autorId_fkey";

-- AddForeignKey
ALTER TABLE "Notificacoes" ADD CONSTRAINT "Notificacoes_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostagemComunidade" ADD CONSTRAINT "PostagemComunidade_autorId_fkey" FOREIGN KEY ("autorId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comentario" ADD CONSTRAINT "Comentario_autorId_fkey" FOREIGN KEY ("autorId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Denuncia" ADD CONSTRAINT "Denuncia_denuncianteId_fkey" FOREIGN KEY ("denuncianteId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MetricasUsuario" ADD CONSTRAINT "MetricasUsuario_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;
