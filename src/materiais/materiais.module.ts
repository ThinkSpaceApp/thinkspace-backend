import { Module } from "@nestjs/common";
import { MateriaisController } from "./materiais.controller";
import { MateriaisService } from "./materiais.service";
import { PrismaModule } from "../prisma/prisma.module";

@Module({
  imports: [PrismaModule],
  controllers: [MateriaisController],
  providers: [MateriaisService],
  exports: [MateriaisService],
})
export class MateriaisModule {}
