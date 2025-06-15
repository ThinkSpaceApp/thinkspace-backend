import { Module } from "@nestjs/common";
import { HomeController } from "./home.controller";
import { UsersModule } from "../users/users.module";
import { PrismaModule } from "../prisma/prisma.module";

@Module({  
  imports: [UsersModule, PrismaModule],
  controllers: [HomeController],
})
export class HomeModule {}
