import { Module } from '@nestjs/common';
import { NotificacoesController } from './notificacoes.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
	imports: [PrismaModule],
	controllers: [NotificacoesController],
	providers: [],
})
export class NotificacoesModule {}
