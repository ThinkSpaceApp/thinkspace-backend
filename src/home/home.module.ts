import { Module } from "@nestjs/common";
import { HomeController } from "./home.controller";
import { UsersModule } from "../users/users.module";
import { PrismaModule } from "../prisma/prisma.module";
import { SetupModule } from "../salaEstudo/setup.module";

@Module({
  imports: [UsersModule, PrismaModule, SetupModule],
  controllers: [HomeController],
})
export class HomeModule {}
