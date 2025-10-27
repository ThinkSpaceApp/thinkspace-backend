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
        recorrente?: boolean;
        duracaoRecorrencia?: number;
        anotacao?: string;
      }
    ) {
      const coresPermitidas = [
        'vermelho', 'laranja', 'amarelo', 'verdeClaro', 'verdeEscuro',
        'azulClaro', 'azulEscuro', 'lilas', 'rosa'
      ];
      if (!coresPermitidas.includes(body.cor)) {
        throw new Error('Cor não permitida.');
      }

      let dataInicio = new Date(body.data);
      if (body.horario) {
        const [h, m] = body.horario.split(':').map(Number);
        dataInicio.setHours(h, m, 0, 0);
      }

      let dataFim: Date | undefined = undefined;
      if (body.recorrente && body.duracaoRecorrencia) {
        dataFim = new Date(dataInicio);
        dataFim.setDate(dataFim.getDate() + body.duracaoRecorrencia);
      }

      let materiaId = body.materiaId || null;

      const evento = await this.prisma.calendario.create({
        data: {
          titulo: body.anotacao ? body.anotacao.substring(0, 50) : 'Evento',
          descricao: body.anotacao,
          dataInicio,
          dataFim,
          tipo: 'OUTRO',
          recorrente: !!body.recorrente,
          intervaloDias: body.recorrente ? 1 : null,
          dataTerminoRecorrencia: dataFim,
          usuarioId,
          materiaId,
          // cor: body.cor,
        },
      });
      return evento;
    }
}
