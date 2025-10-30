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
      select: {
        id: true,
        titulo: true,
        subtitulo: true,
        descricao: true,
        dataInicio: true,
        dataFim: true,
        cor: true,
        materiaId: true,
        recorrente: true,
        intervaloDias: true,
        dataTerminoRecorrencia: true,
        notificar: true,
        usuarioId: true,
        salaId: true,
        tipo: true,
        criadoEm: true,
      },
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

    try {
      const evento = await this.prisma.calendario.create({
        data: {
          titulo: body.titulo || 'Evento',
          subtitulo: body.subtitulo || null,
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
            usuarioId,
            cor: evento.cor,
            dataAnotacao: evento.dataInicio,
            titulo: 'Evento do calendário',
            subtitulo: evento.subtitulo || null,
            mensagem: evento.titulo,
          },
        });
      }

      return {
        ...evento,
        subtitulo: body.subtitulo || null,
      };
    } catch (error: any) {
      if (error.code === 'P2002' && error.meta?.target?.includes('usuarioId_titulo')) {
        throw new Error('Já existe um evento/anotação com esse nome. Escolha um título diferente.');
      }
      throw error;
    }
  }

  async getEventosRecentes(usuarioId: string) {
    return this.prisma.calendario.findMany({
      where: { usuarioId },
      orderBy: { dataInicio: 'desc' },
      select: {
        id: true,
        titulo: true,
        subtitulo: true,
        descricao: true,
        cor: true,
        dataInicio: true,
        dataFim: true,
        tipo: true,
        recorrente: true,
        intervaloDias: true,
        dataTerminoRecorrencia: true,
        notificar: true,
        usuarioId: true,
        salaId: true,
        materiaId: true,
        criadoEm: true,
      },
    });
  }

  async deletarEvento(usuarioId: string, id: string) {
    const evento = await this.prisma.calendario.findUnique({ where: { id } });
    if (!evento || evento.usuarioId !== usuarioId) {
      throw new Error('Evento/anotação não encontrado.');
    }
    await this.prisma.notificacao.deleteMany({
      where: {
        usuarioId: usuarioId,
        mensagem: evento.titulo,
        dataAnotacao: evento.dataInicio,
      },
    });
    await this.prisma.calendario.delete({ where: { id } });
    return { message: 'Evento/anotação e notificações relacionadas deletados com sucesso.' };
  }

  async getEventoIdPorTitulo(usuarioId: string, titulo: string) {
    const evento = await this.prisma.calendario.findMany({ where: { usuarioId, titulo } });
    if (evento.length === 0) {
      throw new Error('Evento/anotação não encontrado.');
    }
    if (evento.length > 1) {
      throw new Error('Mais de um evento/anotação com esse título. O título deve ser único por usuário.');
    }
    return { id: evento[0].id };
  }
}
