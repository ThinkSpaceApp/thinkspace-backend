import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { toZonedTime } from "date-fns-tz";
import { getNivelInfo } from "../experiencia/niveis-xp";

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
    const palette = ["8e44ad", "a18ddf", "ee82a2", "1a355f"];
    return topExp.map((exp, idx) => {
      const nivelInfo = getNivelInfo(exp.xp);
      const usuario = exp.usuario;
      let iniciais = "";
      const nome = usuario.primeiroNome?.trim() || "";
      const sobrenome = usuario.sobrenome?.trim() || "";
      if (nome || sobrenome) {
        iniciais = `${nome.charAt(0)}${sobrenome.charAt(0)}`.toUpperCase();
      } else if (usuario.nomeCompleto) {
        const partes = usuario.nomeCompleto.trim().split(" ");
        iniciais =
          partes.length > 1
            ? `${partes[0][0]}${partes[1][0]}`.toUpperCase()
            : `${partes[0][0]}`.toUpperCase();
      } else if (usuario.email) {
        iniciais = usuario.email.charAt(0).toUpperCase();
      } else {
        iniciais = "U";
      }
      const corAvatar = palette[idx % palette.length];
      const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(iniciais)}&background=${corAvatar}&color=fff`;
      return {
        rank: idx + 1,
        xp: exp.xp,
        nivel: exp.nivel,
        progresso: exp.progresso,
        maxXp: nivelInfo.maxXp,
        usuario: {
          id: usuario.id,
          primeiroNome: usuario.primeiroNome,
          sobrenome: usuario.sobrenome,
          nomeCompleto: usuario.nomeCompleto,
          email: usuario.email,
          foto: avatarUrl,
        },
      };
    });
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

    const materiasUsuario = await this.prisma.materia.findMany({
      where: { usuarioId: userId },
      select: { id: true },
    });
    const materiaIdsUsuario = materiasUsuario.map(m => m.id);
    const materiais = await this.prisma.materialEstudo.findMany({
      where: { autorId: userId },
      include: { materia: true },
      orderBy: { criadoEm: "asc" },
    });
  let totalQuestoes = 0;
  let acertos = 0;
  let erros = 0;
  const atividadesQuiz = atividades.filter(a => typeof a.acertou === 'boolean');
  acertos = atividadesQuiz.filter(a => a.acertou).length;
  erros = atividadesQuiz.filter(a => a.acertou === false).length;
  totalQuestoes = atividadesQuiz.length;
  const questoesPorDia: Record<string, number> = {};
  for (const atividade of atividadesQuiz) {
    const dia = new Date(atividade.data).toISOString().slice(0, 10);
    if (!questoesPorDia[dia]) {
      questoesPorDia[dia] = 1;
    } else {
      questoesPorDia[dia]++;
    }
  }
    const xpPorMateria: Record<string, { nome: string; xp: number; cor: string; icone: string }> = {};
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
          let xpMateria = 0;
          quizzes.forEach((quiz, idx) => {
            const respostaUsuario = respostas[idx] || respostas[String(idx)];
            if (respostaUsuario) {
              if (respostaUsuario === quiz.correta) {
                xpMateria += 5;
              } else {
                xpMateria -= 2;
              }
            }
          });
          if (material.materia && materiaIdsUsuario.includes(material.materia.id)) {
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
    };
  }
}
