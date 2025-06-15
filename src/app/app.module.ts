import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { PrismaModule } from "../prisma/prisma.module";
import { AuthModule } from "../auth/auth.module";
import { MateriasModule } from "../materias/materias.module";
import { HomeModule } from "../home/home.module";
import { AppController } from "./app.controller";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ".env",
    }),
    PrismaModule,
    AuthModule,
    MateriasModule,
    HomeModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
