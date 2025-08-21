import { Module } from "@nestjs/common";
import { salaEstudoController } from "./salaEstudo.controller";
import { salaEstudoService } from "./salaEstudo.service";
import { PrismaModule } from "../prisma/prisma.module";

@Module({
  imports: [PrismaModule],
  controllers: [salaEstudoController],
  providers: [salaEstudoService],
  exports: [salaEstudoService],
})
export class salaEstudoModule {}
