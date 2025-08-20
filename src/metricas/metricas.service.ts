import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class MetricasService {
  async getRanking() {
    const topExp = await this.prisma.experienciaUsuario.findMany({
      orderBy: { xp: 'desc' },
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
    const hoje = new Date();
    const inicioSemana = new Date(hoje);
    inicioSemana.setDate(hoje.getDate() - hoje.getDay() - (weeksAgo * 7));
    inicioSemana.setHours(0, 0, 0, 0);
    const fimSemana = new Date(inicioSemana);
    fimSemana.setDate(inicioSemana.getDate() + 6);
    fimSemana.setHours(23, 59, 59, 999);

    const atividades = await this.prisma.atividadeUsuario.findMany({
      where: {
        usuarioId: userId,
        data: {
          gte: inicioSemana,
          lte: fimSemana,
        },
      },
    });
    const totalDias = atividades.length;
    const rendimentoSemanal = totalDias ? (atividades.filter(a => a.quantidade > 0).length / 7) * 100 : 0;

    const materiais = await this.prisma.materialEstudo.findMany({
      where: { autorId: userId },
      include: { materia: true },
      orderBy: { criadoEm: 'asc' },
    });
    let totalQuestoes = 0;
    let acertos = 0;
    let erros = 0;
    const questoesPorDia: Record<string, number> = {};
    const xpPorMateria: Record<string, { nome: string, xp: number, cor: string, icone: string }> = {};

    for (const material of materiais) {
      let quizzes: any[] = [];
      let respostas: Record<string | number, string> = {};
      try {
        quizzes = material.quizzesJson ? JSON.parse(material.quizzesJson) : [];
      } catch {}
      try {
        respostas = material.respostasQuizJson ? JSON.parse(material.respostasQuizJson) : {};
      } catch {}
      const dateKey = material.criadoEm ? new Date(material.criadoEm).toISOString().slice(0, 10) : null;
      if (dateKey) {
        const materialDate = new Date(material.criadoEm);
        if (materialDate >= inicioSemana && materialDate <= fimSemana) {
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
    const percentualAcertos = totalQuestoes ? (acertos / totalQuestoes) * 100 : 0;
    const percentualErros = totalQuestoes ? (erros / totalQuestoes) * 100 : 0;

    const melhoresMaterias = Object.values(xpPorMateria)
      .sort((a, b) => b.xp - a.xp)
      .slice(0, 5);

    return {
      rendimentoSemanal: Number(rendimentoSemanal.toFixed(2)),
      percentualAcertos: Number(percentualAcertos.toFixed(2)),
      percentualErros: Number(percentualErros.toFixed(2)),
      totalQuestoes,
      acertos,
      erros,
      questoesPorDia,
      inicioSemana: inicioSemana.toISOString().slice(0, 10),
      fimSemana: fimSemana.toISOString().slice(0, 10),
      melhoresMaterias
    };
  }
}
