
import { Controller, Get, Post, Body, Query, Req, UseGuards, BadRequestException } from '@nestjs/common';
import { CalendarioService } from './calendario.service';
import { JwtAuthGuard } from '../auth/strategies/jwt-auth.guard';

@Controller('calendario')
export class CalendarioController {
  constructor(private readonly calendarioService: CalendarioService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
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
