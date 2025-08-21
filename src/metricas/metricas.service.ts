import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { toZonedTime } from "date-fns-tz";

@Injectable()
export class MetricasService {
  async getRanking() {
    const topExp = await this.prisma.experienciaUsuario.findMany({
      orderBy: { xp: "desc" },
      take: 10,
      include: {
        usuario: {
          select: {
            id: true,
            primeiroNome: true,
            sobrenome: true,
            nomeCompleto: true,
            email: true,
            foto: true,
          },
        },
      },
    });
    return topExp.map((exp, idx) => ({
      rank: idx + 1,
      xp: exp.xp,
      nivel: exp.nivel,
      progresso: exp.progresso,
      usuario: exp.usuario,
    }));
  }
  constructor(private readonly prisma: PrismaService) {}

  async getMetricasAluno(userId: string, weeksAgo: number = 0) {
    const timeZone = "America/Sao_Paulo";
    const hoje = toZonedTime(new Date(), timeZone);
    const dayOfWeek = hoje.getDay();
    const inicioSemanaDate = new Date(hoje);
    inicioSemanaDate.setDate(hoje.getDate() - dayOfWeek - weeksAgo * 7);
    inicioSemanaDate.setHours(0, 0, 0, 0);
    const inicioSemana = new Date(
      Date.UTC(
        inicioSemanaDate.getFullYear(),
        inicioSemanaDate.getMonth(),
        inicioSemanaDate.getDate(),
        inicioSemanaDate.getHours(),
        inicioSemanaDate.getMinutes(),
        inicioSemanaDate.getSeconds(),
        inicioSemanaDate.getMilliseconds(),
      ),
    );
    const fimSemanaDate = new Date(inicioSemanaDate);
    fimSemanaDate.setDate(inicioSemanaDate.getDate() + 6);
    fimSemanaDate.setHours(23, 59, 59, 999);
    const fimSemana = new Date(
      Date.UTC(
        fimSemanaDate.getFullYear(),
        fimSemanaDate.getMonth(),
        fimSemanaDate.getDate(),
        fimSemanaDate.getHours(),
        fimSemanaDate.getMinutes(),
        fimSemanaDate.getSeconds(),
        fimSemanaDate.getMilliseconds(),
      ),
    );

    const atividades = await this.prisma.atividadeUsuario.findMany({
      where: {
        usuarioId: userId,
        data: {
          gte: inicioSemana,
          lte: fimSemana,
        },
      },
    });
    const diasComAtividade = new Set(
      atividades
        .filter((a) => a.quantidade > 0)
        .map((a) => new Date(a.data).toISOString().slice(0, 10)),
    ).size;
    const diasNaSemana = 7;
    const rendimentoSemanal =
      diasNaSemana > 0 ? Math.min((diasComAtividade / diasNaSemana) * 100, 100) : 0;

    const materiais = await this.prisma.materialEstudo.findMany({
      where: { autorId: userId },
      include: { materia: true },
      orderBy: { criadoEm: "asc" },
    });
    let totalQuestoes = 0;
    let acertos = 0;
    let erros = 0;
    const questoesPorDia: Record<string, number> = {};
    const xpPorMateria: Record<string, { nome: string; xp: number; cor: string; icone: string }> =
      {};

    for (const material of materiais) {
      let quizzes: any[] = [];
      let respostas: Record<string | number, string> = {};
      try {
        quizzes = material.quizzesJson ? JSON.parse(material.quizzesJson) : [];
      } catch {}
      try {
        respostas = material.respostasQuizJson ? JSON.parse(material.respostasQuizJson) : {};
      } catch {}
      const materialDate = material.criadoEm
        ? toZonedTime(new Date(material.criadoEm), timeZone)
        : null;
      const dateKey = materialDate ? materialDate.toISOString().slice(0, 10) : null;
      if (dateKey) {
        if (
          materialDate &&
          materialDate >= toZonedTime(inicioSemana, timeZone) &&
          materialDate <= toZonedTime(fimSemana, timeZone)
        ) {
          let realizadasHoje = 0;
          let xpMateria = 0;
          quizzes.forEach((quiz, idx) => {
            totalQuestoes++;
            const respostaUsuario = respostas[idx] || respostas[String(idx)];
            if (respostaUsuario) {
              realizadasHoje++;
              if (respostaUsuario === quiz.correta) {
                acertos++;
                xpMateria += 5;
              } else {
                erros++;
                xpMateria -= 2;
              }
            }
          });
          questoesPorDia[dateKey] = (questoesPorDia[dateKey] || 0) + realizadasHoje;
          if (material.materia) {
            const matId = material.materia.id;
            if (!xpPorMateria[matId]) {
              xpPorMateria[matId] = {
                nome: material.materia.nome,
                xp: 0,
                cor: material.materia.cor,
                icone: material.materia.icone,
              };
            }
            xpPorMateria[matId].xp += xpMateria;
          }
        }
      }
    }
    const experiencia = await this.prisma.experienciaUsuario.findUnique({
      where: { usuarioId: userId },
    });
    if (acertos < 0) acertos = 0;
    if (erros < 0) erros = 0;
    let percentualAcertos = totalQuestoes ? (acertos / totalQuestoes) * 100 : 0;
    let percentualErros = totalQuestoes ? (erros / totalQuestoes) * 100 : 0;
    percentualAcertos = Math.max(0, Math.min(percentualAcertos, 100));
    percentualErros = Math.max(0, Math.min(percentualErros, 100));
    const melhoresMaterias = Object.values(xpPorMateria)
      .sort((a, b) => b.xp - a.xp)
      .slice(0, 5);
    const atividadesHistorico = await this.prisma.atividadeUsuario.findMany({
      where: { usuarioId: userId },
      orderBy: { data: "asc" },
    });
    let ofensiva = 0;
    let maxOfensiva = 0;
    let anterior: string | null = null;
    for (const atividade of atividadesHistorico) {
      if (atividade.quantidade > 0) {
        const dia = new Date(atividade.data).toISOString().slice(0, 10);
        if (anterior) {
          const diff = (new Date(dia).getTime() - new Date(anterior).getTime()) / (1000 * 60 * 60 * 24);
          if (diff === 1) {
            ofensiva++;
          } else if (diff > 1) {
            ofensiva = 1;
          }
        } else {
          ofensiva = 1;
        }
        anterior = dia;
        if (ofensiva > maxOfensiva) maxOfensiva = ofensiva;
      }
    }
    const mensagemOfensiva = `Sua ofensiva atual é de ${ofensiva} dia${ofensiva === 1 ? '' : 's'}`;
    return {
      rendimentoSemanal: Number(rendimentoSemanal.toFixed(2)),
      xp: experiencia ? experiencia.xp : 0,
      percentualAcertos: Number(percentualAcertos.toFixed(2)),
      percentualErros: Number(percentualErros.toFixed(2)),
      totalQuestoes,
      acertos,
      erros,
      questoesPorDia,
      inicioSemana: inicioSemana.toISOString().slice(0, 10),
      fimSemana: fimSemana.toISOString().slice(0, 10),
      melhoresMaterias,
      ofensiva,
      mensagemOfensiva,
    };
  }
}
