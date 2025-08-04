import { Module } from "@nestjs/common";
import { MateriaisController } from "./materiais.controller";
import { MateriaisService } from "./materiais.service";
import { PdfProcessorService } from "./services/pdf-processor.service";
import { Glm45Service } from "./services/glm-4.5.service";
import { PrismaModule } from "../prisma/prisma.module";

@Module({
  imports: [PrismaModule],
  controllers: [MateriaisController],
  providers: [MateriaisService, PdfProcessorService, Glm45Service],
  exports: [MateriaisService],
})
export class MateriaisModule {}
