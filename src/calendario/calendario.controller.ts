import { Controller, Get, Post, Body, Query, Req, UseGuards, BadRequestException } from '@nestjs/common';
import { CalendarioService } from './calendario.service';
import { JwtAuthGuard } from '../auth/strategies/jwt-auth.guard';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiBody } from '@nestjs/swagger';

@ApiTags('Calendário')
@ApiBearerAuth()
@Controller('calendario')
export class CalendarioController {
  constructor(private readonly calendarioService: CalendarioService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  @ApiOperation({ summary: 'Obter calendário do mês', description: 'Retorna os dias do mês com anotações/eventos do usuário.' })
  @ApiQuery({ name: 'mes', required: true, type: Number, description: 'Mês (1-12)' })
  @ApiQuery({ name: 'ano', required: true, type: Number, description: 'Ano (ex: 2025)' })
  @ApiResponse({
    status: 200,
    description: 'Calendário do mês',
    schema: {
      type: 'object',
      properties: {
        mes: { type: 'number', example: 10 },
        ano: { type: 'number', example: 2025 },
        dias: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              dia: { type: 'number', example: 15 },
              diaSemana: { type: 'number', example: 2, description: '0=domingo, 6=sábado' },
              anotacoes: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    titulo: { type: 'string' },
                    descricao: { type: 'string', nullable: true },
                    dataInicio: { type: 'string', format: 'date-time' },
                    dataFim: { type: 'string', format: 'date-time', nullable: true },
                    cor: { type: 'string', nullable: true },
                    materiaId: { type: 'string', nullable: true },
                    recorrente: { type: 'boolean' },
                  },
                },
              },
            },
          },
        },
      },
    },
  })
  async getCalendario(
    @Query('mes') mes: number,
    @Query('ano') ano: number,
    @Req() req: any
  ) {
    const usuarioId = req.user?.sub;
    return this.calendarioService.getCalendarioMes(usuarioId, mes, ano);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  @ApiOperation({ summary: 'Criar evento no calendário', description: 'Cria um novo evento/anotação no calendário do usuário.' })
  @ApiBody({
    required: true,
    schema: {
      type: 'object',
      properties: {
        data: { type: 'string', format: 'date', example: '2025-10-27', description: 'Data do evento (obrigatório, formato YYYY-MM-DD ou ISO)' },
        horario: { type: 'string', example: '14:30', description: 'Horário do evento (opcional, formato HH:mm)' },
        materiaId: { type: 'string', example: 'clv1abc234', description: 'ID da matéria associada (opcional)' },
        cor: { type: 'string', example: 'azulClaro', description: 'Cor principal do evento (obrigatório): vermelho, laranja, amarelo, verdeClaro, verdeEscuro, azulClaro, azulEscuro, lilas, rosa' },
        recorrente: { type: 'boolean', example: false, description: 'Se o evento é recorrente (opcional)' },
        duracaoRecorrencia: { type: 'number', example: 7, description: 'Duração da recorrência em dias (opcional, obrigatório se recorrente)' },
        anotacao: { type: 'string', example: 'Estudar capítulo 5', description: 'Anotação ou descrição do evento (opcional)' },
      },
      required: ['data', 'cor'],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Evento criado com sucesso',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        titulo: { type: 'string' },
        descricao: { type: 'string', nullable: true },
        dataInicio: { type: 'string', format: 'date-time' },
        dataFim: { type: 'string', format: 'date-time', nullable: true },
        cor: { type: 'string', nullable: true },
        materiaId: { type: 'string', nullable: true },
        recorrente: { type: 'boolean' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Data e cor são obrigatórias.' })
  @ApiResponse({ status: 401, description: 'Não autorizado.' })
  @ApiResponse({ status: 500, description: 'Erro interno.' })
  async criarEventoCalendario(
    @Req() req: any,
    @Body() body: {
      data: string; 
      horario?: string; 
      materiaId?: string; 
      cor: string; 
      recorrente?: boolean;
      duracaoRecorrencia?: number;
      anotacao?: string;
    }
  ) {
    const usuarioId = req.user?.sub;
    if (!body.data || !body.cor) {
      throw new BadRequestException('Data e cor são obrigatórias.');
    }
    return this.calendarioService.criarEventoCalendario(usuarioId, body);
  }
}
