import { Module } from "@nestjs/common";
import { MateriasController } from "./materias.controller";
import { PrismaModule } from "../prisma/prisma.module";
import { UsersModule } from "../users/users.module";
import { SetupModule } from "../salaEstudo/setup.module";

@Module({
  imports: [PrismaModule, UsersModule, SetupModule],
  controllers: [MateriasController],
  exports: [],
})
export class MateriasModule {}
