import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app/app.module";
import cookieParser from "cookie-parser";
import { ConfigService } from "@nestjs/config";
import { Request, Response, NextFunction } from "express";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(cookieParser());
  app.enableCors({
    origin: "https://thinkspace.app.br", // ou ["https://thinkspace.app.br", "http://localhost:3000"] para dev
    credentials: true,  // ESSENCIAL para cookies cross-origin
    allowedHeaders: ["Content-Type", "Authorization", "Accept"],
    methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE"],
  });

  // app.use((req: Request, res: Response, next: NextFunction) => {
  //   if (req.path === "/" || req.path === "") {
  //     const token = req.cookies?.token || req.headers.authorization?.replace("Bearer ", "");
  //     if (!token) {
  //       throw new Error("Token de autenticação não encontrado");
  //     }
  //   }
  //   next();
  // });

  app.enableShutdownHooks();

  const configService = app.get(ConfigService);
  const port = configService.get<number>("PORT") || 5000;

  await app.listen(port, () => {
    console.log(`🗄️ DATABASE_URL em uso: ${configService.get<string>("DATABASE_URL")}`);
    console.log(`🚀 Servidor rodando na porta http://localhost:${port}`);
    console.log(`📡 Environment: ${configService.get("NODE_ENV")}`);
  });
}

bootstrap();
