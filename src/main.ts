import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  
  app.enableShutdownHooks();

  const port = configService.get<number>('PORT') || 3000;
  
  await app.listen(port, () => {
    console.log(`🚀 Servidor rodando na porta http://localhost:${port}`);
    console.log(`📡 Environment: ${configService.get('NODE_ENV')}`);
  });
}

bootstrap();