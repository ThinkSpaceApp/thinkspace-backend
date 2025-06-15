import { Module } from "@nestjs/common";
import { MateriasController } from "./materias.controller";
import { UsersService } from "../users/users.service";
import { PrismaModule } from "../prisma/prisma.module";
import { UsersModule } from "../users/users.module";

@Module({
  imports: [PrismaModule, UsersModule],
  controllers: [MateriasController],
  providers: [UsersService],
  exports: [],
})
export class MateriasModule {}
