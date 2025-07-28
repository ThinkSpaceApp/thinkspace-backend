import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { PrismaModule } from "../prisma/prisma.module";
import { AuthModule } from "../auth/auth.module";
import { MateriaisModule } from "../materiais/materiais.module";
import { MateriasModule } from "../materias/materias.module";
import { HomeModule } from "../home/home.module";
import { AppController } from "./app.controller";
import { SetupModule } from "../salaEstudo/setup.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ".env",
    }),
    PrismaModule,
    AuthModule,
    MateriasModule,
    MateriaisModule,
    HomeModule,
    SetupModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
