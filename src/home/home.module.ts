import { Module } from "@nestjs/common";
import { HomeController } from "./home.controller";
import { UsersModule } from "../users/users.module";
import { PrismaModule } from "../prisma/prisma.module";
import { salaEstudoModule } from "../salaEstudo/salaEstudo.module";

@Module({
  imports: [UsersModule, PrismaModule, salaEstudoModule],
  controllers: [HomeController],
})
export class HomeModule {}
