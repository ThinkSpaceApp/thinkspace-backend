import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { NivelUsuario } from "@prisma/client";

@Injectable()
export class ExperienciaService {
  constructor(private readonly prisma: PrismaService) {}

  async calcularXpQuiz(usuarioId: string, totalQuestoes: number, certas: number): Promise<{ xp: number; xpAnterior: number; xpFinal: number; progresso: number; nivel: string; mensagem: string }> {
    let experiencia = await this.prisma.experienciaUsuario.findUnique({ where: { usuarioId } });
    if (!experiencia) {
      const { getProgressoNivel } = await import("./niveis-xp");
      const { nivel, progresso } = getProgressoNivel(0);
      experiencia = await this.prisma.experienciaUsuario.create({
        data: {
          usuarioId,
          xp: 0,
          progresso,
          nivel: nivel.nome as NivelUsuario,
        },
      });
    }
    const erradas = totalQuestoes - certas;
    let xp = 10 + (certas * 5) - (erradas * 2);
    if (xp < 0) xp = 0;
    const xpAnterior = experiencia.xp;
    const xpFinal = xpAnterior + xp;
    const { getProgressoNivel } = await import("./niveis-xp");
    const { nivel, progresso } = getProgressoNivel(xpFinal);
    await this.prisma.experienciaUsuario.update({
      where: { usuarioId },
      data: {
        xp: xpFinal,
        progresso,
        nivel: nivel.nome as NivelUsuario,
      },
    });
    return {
      xp,
      xpAnterior,
      xpFinal,
      progresso,
      nivel: nivel.nome,
      mensagem: `XP calculada: +${xp} (certas: +${certas * 5}, erradas: -${erradas * 2}, participação: +10). XP final: ${xpFinal}. Progresso para o próximo nível: ${progresso.toFixed(2)}%. Nível atual: ${nivel.nome}.`,
    };
  }
}
