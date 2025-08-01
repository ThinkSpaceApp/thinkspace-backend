import { Module } from "@nestjs/common";
import { UsersService } from "./users.service";
import { UsersController } from "./users.controller";
import { PrismaModule } from "../prisma/prisma.module";
import { salaEstudoModule } from "../salaEstudo/salaEstudo.module";

@Module({
  imports: [PrismaModule, salaEstudoModule],
  providers: [UsersService],
  controllers: [UsersController],
  exports: [UsersService],
})
export class UsersModule {}
