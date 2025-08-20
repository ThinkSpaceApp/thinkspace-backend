import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class MetricasService {
  constructor(private readonly prisma: PrismaService) {}

  async getMetricasAluno(userId: string) {
    const hoje = new Date();
    const inicioSemana = new Date(hoje);
    inicioSemana.setDate(hoje.getDate() - hoje.getDay());
    const fimSemana = new Date(inicioSemana);
    fimSemana.setDate(inicioSemana.getDate() + 6);

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
    });
    let totalQuestoes = 0;
    let acertos = 0;
    let erros = 0;

    for (const material of materiais) {
      let quizzes: any[] = [];
      let respostas: Record<string | number, string> = {};
      try {
        quizzes = material.quizzesJson ? JSON.parse(material.quizzesJson) : [];
      } catch {}
      try {
        respostas = material.respostasQuizJson ? JSON.parse(material.respostasQuizJson) : {};
      } catch {}
      quizzes.forEach((quiz, idx) => {
        totalQuestoes++;
        const respostaUsuario = respostas[idx] || respostas[String(idx)];
        if (respostaUsuario) {
          if (respostaUsuario === quiz.correta) {
            acertos++;
          } else {
            erros++;
          }
        }
      });
    }
    const percentualAcertos = totalQuestoes ? (acertos / totalQuestoes) * 100 : 0;
    const percentualErros = totalQuestoes ? (erros / totalQuestoes) * 100 : 0;

    return {
      rendimentoSemanal: Number(rendimentoSemanal.toFixed(2)),
      percentualAcertos: Number(percentualAcertos.toFixed(2)),
      percentualErros: Number(percentualErros.toFixed(2)),
      totalQuestoes,
      acertos,
      erros,
    };
  }
}
