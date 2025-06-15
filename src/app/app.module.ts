import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { PrismaModule } from "../prisma/prisma.module";
import { AuthModule } from "../auth/auth.module";
import { HomeModule } from "../auth/auth.module";
import { MateriaisModule } from "../materiais/materiais.module";
import { AppController } from "./app.controller";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ".env",
    }),
    PrismaModule,
    AuthModule,
    MateriaisModule,
    HomeModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
