import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app/app.module";
import cookieParser from "cookie-parser";
import { ConfigService } from "@nestjs/config";
import { Request, Response, NextFunction } from "express";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";

const SWAGGER_USER = process.env.SWAGGER_USER;
const SWAGGER_PASS = process.env.SWAGGER_PASS;

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use((req: Request, res: Response, next: NextFunction) => {
    res.header("Access-Control-Allow-Origin", "https://thinkspace.app.br");
    res.header("Access-Control-Allow-Credentials", "true");
    res.header(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization, Accept, Origin, X-Requested-With",
    );
    res.header("Access-Control-Allow-Methods", "GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS");
    next();
  });
  const bodyParser = require("body-parser");
  app.use(bodyParser.json({ limit: "50mb" }));
  app.use(bodyParser.urlencoded({ limit: "50mb", extended: true }));

  const expressApp = app.getHttpAdapter().getInstance();
  expressApp.set("trust proxy", 1);

  app.use((req: Request, res: Response, next: NextFunction) => {
    console.log("Protocol:", req.protocol);
    next();
  });

  app.use(cookieParser());

  const isProduction = process.env.NODE_ENV === "production";

  app.enableCors({
    origin: ["https://thinkspace.app.br", "http://localhost:3000"],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization", "Accept", "Origin", "X-Requested-With"],
    methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE", "OPTIONS"],
    exposedHeaders: ["Set-Cookie"],
  });

  app.enableShutdownHooks();

  app.use("/docs", (req: Request, res: Response, next: NextFunction) => {
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith("Basic ")) {
      res.setHeader("WWW-Authenticate", 'Basic realm="Swagger"');
      return res.status(401).send("Autenticação necessária");
    }
    const base64Credentials = auth.split(" ")[1];
    const [user, pass] = Buffer.from(base64Credentials, "base64").toString().split(":");
    if (user !== SWAGGER_USER || pass !== SWAGGER_PASS) {
      res.setHeader("WWW-Authenticate", 'Basic realm="Swagger"');
      return res.status(401).send("Credenciais inválidas");
    }
    next();
  });

  const config = new DocumentBuilder()
    .setTitle("ThinkSpace API")
    .setDescription("Documentação da API ThinkSpace")
    .setVersion("1.0")
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("docs", app, document);

  const configService = app.get(ConfigService);
  const port = configService.get<number>("PORT") || 5000;

  await app.listen(port, () => {
    console.log(`🗄️ DATABASE_URL em uso: ${configService.get<string>("DATABASE_URL")}`);
    console.log(`🚀 Servidor rodando na porta http://localhost:${port}`);
    console.log(`📡 Environment: ${configService.get("NODE_ENV")}`);
  });
}

bootstrap();
