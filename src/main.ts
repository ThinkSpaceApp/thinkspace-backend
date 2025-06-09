import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app/app.module";
import { ConfigService } from "@nestjs/config";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  console.log(`🗄️ DATABASE_URL em uso: ${configService.get<string>("DATABASE_URL")}`);

  app.enableCors({
    origin: ["http://localhost:3000", "http://thinkspace.app.br"], // URL do frontend
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
    credentials: true,
    allowedHeaders: "Content-Type, Authorization, Accept",
  });

  app.enableShutdownHooks();

  const port = configService.get<number>("PORT") || 5000;

  await app.listen(port, () => {
    console.log(`🚀 Servidor rodando na porta http://localhost:${port}`);
    console.log(`📡 Environment: ${configService.get("NODE_ENV")}`);
  });
}

bootstrap();
