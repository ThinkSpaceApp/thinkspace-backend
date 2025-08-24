-- DropForeignKey
ALTER TABLE "ChatMensagem" DROP CONSTRAINT "ChatMensagem_materialId_fkey";

-- AddForeignKey
ALTER TABLE "ChatMensagem" ADD CONSTRAINT "ChatMensagem_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "MaterialEstudo"("id") ON DELETE CASCADE ON UPDATE CASCADE;
