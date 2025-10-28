import { Controller, Get, Req, UseGuards, Delete, Param, ParseUUIDPipe, Query, BadRequestException } from '@nestjs/common';
import { CalendarioService } from './calendario.service';
import { JwtAuthGuard } from '../auth/strategies/jwt-auth.guard';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('Calendário')
@ApiBearerAuth()
@Controller('calendario')
export class CalendarioRecentesController {
  constructor(private readonly calendarioService: CalendarioService) {}

  @UseGuards(JwtAuthGuard)
  @Get('recentes')
  @ApiOperation({ summary: 'Listar eventos/anotações mais recentes', description: 'Retorna todos os eventos/anotações do usuário do mais recente para o mais antigo.' })
  @ApiResponse({
    status: 200,
    description: 'Lista de eventos/anotações ordenados do mais recente para o mais antigo',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          titulo: { type: 'string' },
          subtitulo: { type: 'string', nullable: true },
          descricao: { type: 'string', nullable: true },
          cor: { type: 'string', nullable: true },
          dataInicio: { type: 'string', format: 'date-time' },
          dataFim: { type: 'string', format: 'date-time', nullable: true },
          tipo: { type: 'string' },
          recorrente: { type: 'boolean' },
          intervaloDias: { type: 'number', nullable: true },
          dataTerminoRecorrencia: { type: 'string', format: 'date-time', nullable: true },
          notificar: { type: 'boolean' },
          usuarioId: { type: 'string', nullable: true },
          salaId: { type: 'string', nullable: true },
          materiaId: { type: 'string', nullable: true },
          criadoEm: { type: 'string', format: 'date-time' },
        },
      },
    },
  })
  async getEventosRecentes(@Req() req: any) {
    const usuarioId = req.user?.sub;
    return this.calendarioService.getEventosRecentes(usuarioId);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  @ApiOperation({ summary: 'Deletar evento/anotação', description: 'Remove um evento/anotação do calendário pelo ID.' })
  @ApiResponse({ status: 200, description: 'Evento/anotação deletado com sucesso.' })
  @ApiResponse({ status: 404, description: 'Evento/anotação não encontrado.' })
  async deletarEvento(@Req() req: any, @Param('id', new ParseUUIDPipe()) id: string) {
    const usuarioId = req.user?.sub;
    return this.calendarioService.deletarEvento(usuarioId, id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('titulo')
  @ApiOperation({ summary: 'Buscar evento/anotação por título', description: 'Retorna o ID do evento/anotação pelo título. O título deve ser único por usuário.' })
  @ApiResponse({ status: 200, description: 'ID do evento/anotação encontrado.' })
  @ApiResponse({ status: 404, description: 'Evento/anotação não encontrado.' })
  async getEventoIdPorTitulo(@Req() req: any, @Query('titulo') titulo: string) {
    const usuarioId = req.user?.sub;
    if (!titulo) throw new BadRequestException('Título é obrigatório.');
    return this.calendarioService.getEventoIdPorTitulo(usuarioId, titulo);
  }
}
