import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Controller('notificacoes')
export class NotificacoesController {
  constructor(private readonly prisma: PrismaService) {}

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async receberWebhook(@Body() payload: any) {
    try {
      await this.prisma.notificacao.create({
        data: {
          id: payload.notificacaoId,
          usuarioId: payload.usuarioId,
          titulo: payload.titulo,
          subtitulo: payload.subtitulo,
          mensagem: payload.mensagem,
          descricao: payload.descricao,
          dataAnotacao: payload.dataAnotacao ? new Date(payload.dataAnotacao) : undefined,
          cor: payload.cor,
          lida: false,
        },
      });
      return { status: 'ok', saved: true };
    } catch (err) {
      console.error('Erro ao salvar notificação recebida:', err);
      return { status: 'error', saved: false };
    }
  }
}
