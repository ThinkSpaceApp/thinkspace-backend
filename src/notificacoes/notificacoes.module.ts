import { Module } from '@nestjs/common';
import { NotificacoesController } from './notificacoes.controller';

@Module({
	controllers: [NotificacoesController],
	providers: [],
})
export class NotificacoesModule {}
