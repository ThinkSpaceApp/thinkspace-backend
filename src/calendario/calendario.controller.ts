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
  @ApiQuery({ name: 'usuarioId', required: true, type: String, description: 'ID do usuário' })
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
                    subtitulo: { type: 'string', nullable: true },
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
    @Query('usuarioId') usuarioId: string
  ) {
    if (!usuarioId) throw new BadRequestException('usuarioId é obrigatório');
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
        titulo: { type: 'string', example: 'Prova de Matemática', description: 'Título do evento (opcional)' },
        subtitulo: { type: 'string', example: 'Capítulo 5 e 6', description: 'Subtítulo do evento (opcional)' },
        Duracaorecorrente: {
          type: 'string',
          example: 'sempre',
          description: `Duração da recorrência:
            - 'sempre' (repete para sempre)
            - 'ate_data_marcada' (repete até a data marcada)`
        },
        recorrente: {
          type: 'string',
          example: 'diario',
          description: `Tipo de recorrência do evento (opcional):
            - 'nao_repetir' (não repete)
            - 'diario' (a cada dia)
            - 'semanal' (a cada semana)
            - 'mensal' (a cada mês)`
        },
        anotacao: { type: 'string', example: 'Estudar capítulo 5', description: 'Anotação ou descrição do evento (opcional)' },
        notificar: { type: 'boolean', example: true, description: 'Se o usuário deseja ser notificado pela plataforma (opcional, padrão: false)' },
        usuarioId: { type: 'string', example: 'clv1abc234', description: 'ID do usuário (obrigatório)' },
      },
      required: ['data', 'cor', 'usuarioId'],
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
        subtitulo: { type: 'string', nullable: true },
        descricao: { type: 'string', nullable: true },
        dataInicio: { type: 'string', format: 'date-time' },
        dataFim: { type: 'string', format: 'date-time', nullable: true },
        cor: { type: 'string', nullable: true },
        materiaId: { type: 'string', nullable: true },
        recorrente: { type: 'boolean' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Data, cor e usuarioId são obrigatórios.' })
  @ApiResponse({ status: 401, description: 'Não autorizado.' })
  @ApiResponse({ status: 500, description: 'Erro interno.' })
  async criarEventoCalendario(
    @Body() body: {
      data: string;
      horario?: string;
      materiaId?: string;
      cor: string;
      titulo?: string;
      subtitulo?: string;
      Duracaorecorrente?: 'sempre' | 'ate_data_marcada';
      recorrente?: 'diario' | 'nao_repetir' | 'semanal' | 'mensal';
      anotacao?: string;
      notificar?: boolean;
      usuarioId: string;
    }
  ) {
    if (!body.data || !body.cor || !body.usuarioId) {
      throw new BadRequestException('Data, cor e usuarioId são obrigatórios.');
    }

    if (body.notificar) {
      let dataEvento: Date;
      if (body.horario) {
        dataEvento = new Date(`${body.data}T${body.horario}`);
      } else {
        dataEvento = new Date(body.data);
      }
      const agora = new Date();
      if (dataEvento < agora) {
        throw new BadRequestException('Não é possível agendar notificação para eventos em datas/horários passados.');
      }
    }

    return this.calendarioService.criarEventoCalendario(body.usuarioId, body);
  }
}
