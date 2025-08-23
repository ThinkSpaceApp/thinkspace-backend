import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { NivelUsuario } from "@prisma/client";

@Injectable()
export class ExperienciaService {
  constructor(private readonly prisma: PrismaService) {}

  async calcularXpQuiz(
    usuarioId: string,
    totalQuestoes: number,
    certas: number,
  ): Promise<{
    xp: number;
    xpAnterior: number;
    xpFinal: number;
    progresso: number;
    nivel: string;
    mensagem: string;
  }> {
    let experiencia = await this.prisma.experienciaUsuario.findUnique({ where: { usuarioId } });
    function mapNivelNomeToEnum(nome: string): NivelUsuario {
      const nomeUpper = nome
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toUpperCase();
      if (nomeUpper === "INICIANTE") return NivelUsuario.INICIANTE;
      if (nomeUpper === "APRENDIZ") return NivelUsuario.APRENDIZ;
      if (nomeUpper === "JUNIOR" || nomeUpper === "JUNIOR") return NivelUsuario.JUNIOR;
      if (nomeUpper === "AVANCADO" || nomeUpper === "AVANCADO") return NivelUsuario.AVANCADO;
      if (nomeUpper === "ESPECIALISTA") return NivelUsuario.ESPECIALISTA;
      if (nomeUpper === "MENTOR") return NivelUsuario.MENTOR;
      if (nomeUpper === "ELITE") return NivelUsuario.ELITE;
      return NivelUsuario.INICIANTE;
    }
    if (!experiencia) {
      const { getProgressoNivel } = await import("./niveis-xp");
      const { progresso } = getProgressoNivel(0);
      experiencia = await this.prisma.experienciaUsuario.create({
        data: {
          usuarioId,
          xp: 0,
          progresso,
          nivel: mapNivelNomeToEnum("INICIANTE"),
        },
      });
    }
    const erradas = totalQuestoes - certas;
    let xp = certas * 5 - erradas * 2;
    if (certas > 0 || erradas > 0) {
      xp += 10;
    }
    if (xp < 0) xp = 0;
    const xpAnterior = experiencia.xp;
    const xpFinal = xpAnterior + xp;
    const { getProgressoNivel } = await import("./niveis-xp");
    const { nivel, progresso } = getProgressoNivel(xpFinal);
    const experienciaAtualizada = await this.prisma.experienciaUsuario.update({
      where: { usuarioId },
      data: {
        xp: xpFinal,
        progresso,
        nivel: mapNivelNomeToEnum(nivel.nome.toLowerCase()),
      },
      select: {
        xp: true,
        progresso: true,
        nivel: true,
      },
    });
    return {
      xp,
      xpAnterior,
      xpFinal: experienciaAtualizada.xp,
      progresso: experienciaAtualizada.progresso,
      nivel: nivel.nome,
      mensagem: `XP calculada: +${xp} (certas: +${certas * 5}, erradas: -${erradas * 2}, participação: +10). XP atual: ${experienciaAtualizada.xp}. Progresso para o próximo nível: ${experienciaAtualizada.progresso.toFixed(2)}%. Nível atual: ${nivel.nome}.`,
    };
  }
}
