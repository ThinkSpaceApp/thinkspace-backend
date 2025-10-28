import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CalendarioService {
  constructor(private readonly prisma: PrismaService) {}

  async getCalendarioMes(usuarioId: string, mes: number, ano: number) {
    const dataInicio = new Date(ano, mes - 1, 1);
    const dataFim = new Date(ano, mes, 0, 23, 59, 59, 999);
    const eventos = await this.prisma.calendario.findMany({
      where: {
        usuarioId,
        dataInicio: {
          gte: dataInicio,
          lte: dataFim,
        },
      },
      orderBy: { dataInicio: 'asc' },
    });

    const diasNoMes = new Date(ano, mes, 0).getDate();
    const dias = Array.from({ length: diasNoMes }, (_, i) => {
      const dia = i + 1;
      const data = new Date(ano, mes - 1, dia);
      const anotacoes = eventos.filter(ev => new Date(ev.dataInicio).getDate() === dia);
      return {
        dia,
        diaSemana: data.getDay(),
        anotacoes,
      };
    });

    return {
      mes,
      ano,
      dias,
    };
  }

  async criarEventoCalendario(
    usuarioId: string,
    body: {
      data: string;
      horario?: string;
      materiaId?: string;
      cor: string;
      titulo?: string;
      subtitulo?: string;
      Duracaorecorrente?: 'sempre' | 'ate_data_marcada';
      recorrente?: 'nao_repetir' | 'diario' | 'semanal' | 'mensal';
      anotacao?: string;
      notificar?: boolean;
    }
  ) {
    const mapaCores: Record<string, string> = {
      VERMELHO: '#F92A46',
      LARANJA: '#F6A423',
      AMARELO: '#FDE561',
      VERDECLARO: '#8AD273',
      VERDEESCURO: '#6CA559',
      AZULCLARO: '#86BEE1',
      AZULESCURO: '#1B8BD1',
      ROXO: '#8379E2',
      ROSA: '#E572B1',
    };
    let corKey = body.cor?.toUpperCase().normalize('NFD').replace(/[^\w]/g, '');
    if (!mapaCores[corKey]) {
      throw new Error('Cor não permitida. Use: ' + Object.keys(mapaCores).join(', '));
    }

    let dataInicio = new Date(body.data);
    if (body.horario) {
      const [h, m] = body.horario.split(':').map(Number);
      dataInicio.setHours(h, m, 0, 0);
    }

    let dataFim: Date | undefined = undefined;
    let intervaloDias: number | null = null;
    let tipoRecorrencia = body.recorrente || 'nao_repetir';
    if (tipoRecorrencia === 'diario') intervaloDias = 1;
    else if (tipoRecorrencia === 'semanal') intervaloDias = 7;
    else if (tipoRecorrencia === 'mensal') intervaloDias = 30;

    if (tipoRecorrencia !== 'nao_repetir') {
      if (body.Duracaorecorrente === 'ate_data_marcada' && body.data) {
        dataFim = new Date(body.data);
      } else if (body.Duracaorecorrente === 'sempre') {
        dataFim = undefined;
      }
    }

    let materiaId = body.materiaId || null;

    const evento = await this.prisma.calendario.create({
      data: {
        titulo: body.titulo || 'Evento',
        descricao: body.anotacao,
        dataInicio,
        dataFim,
        tipo: 'OUTRO',
        recorrente: tipoRecorrencia !== 'nao_repetir',
        intervaloDias,
        dataTerminoRecorrencia: dataFim,
        usuarioId,
        materiaId,
        cor: mapaCores[corKey],
        notificar: body.notificar ?? false,
      },
    });

    if (body.notificar && usuarioId) {
      await this.prisma.notificacao.create({
        data: {
          mensagem: `Evento criado: ${evento.titulo}${evento.dataInicio ? ' em ' + evento.dataInicio.toLocaleString('pt-BR') : ''}`,
          usuarioId,
        },
      });
    }

    return {
      ...evento,
      subtitulo: body.subtitulo || null,
    };
  }

  async getEventosRecentes(usuarioId: string) {
    return this.prisma.calendario.findMany({
      where: { usuarioId },
      orderBy: { dataInicio: 'desc' },
    });
  }
}
