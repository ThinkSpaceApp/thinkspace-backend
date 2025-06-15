import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app/app.module";
import cookieParser from "cookie-parser";
import { ConfigService } from "@nestjs/config";
import { Request, Response, NextFunction } from "express";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const expressApp = app.getHttpAdapter().getInstance();
  expressApp.set("trust proxy", 1); // ✅ Obrigatório para HTTPS + cookies

  app.use((req: Request, res: Response, next: NextFunction) => {
    console.log("Protocol:", req.protocol);
    next();
  });

  app.use(cookieParser());

  const isProduction = process.env.NODE_ENV === "production";

  app.enableCors({
    origin: isProduction ? ["https://thinkspace.app.br"] : ["http://localhost:3000"],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization", "Accept"],
    methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE"],
    exposedHeaders: ["Set-Cookie"],
  });

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
