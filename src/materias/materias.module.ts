import { Module } from "@nestjs/common";
import { MateriasController } from "./materias.controller";
import { PrismaModule } from "../prisma/prisma.module";
import { UsersModule } from "../users/users.module";
import { salaEstudoModule } from "../salaEstudo/salaEstudo.module";

@Module({
  imports: [PrismaModule, UsersModule, salaEstudoModule],
  controllers: [MateriasController],
  exports: [],
})
export class MateriasModule {}
