import { Module } from '@nestjs/common';
import { ConfiguracoesController } from './configuracoes.controller';
import { ConfiguracoesService } from './configuracoes.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ConfiguracoesController],
  providers: [ConfiguracoesService],
})
export class ConfiguracoesModule {}
