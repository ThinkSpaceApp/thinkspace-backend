import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { NivelUsuario } from "@prisma/client";

@Injectable()
export class ExperienciaService {
  constructor(private readonly prisma: PrismaService) {}

  async calcularXpQuiz(usuarioId: string, totalQuestoes: number, certas: number): Promise<{ xp: number; xpAnterior: number; xpFinal: number; progresso: number; nivel: string; mensagem: string }> {
    const experiencia = await this.prisma.experienciaUsuario.findUnique({ where: { usuarioId } });
    if (!experiencia) {
      throw new NotFoundException("Experiência do usuário não encontrada.");
    }
    const erradas = totalQuestoes - certas;
    let xp = 10 + (certas * 5) - (erradas * 2);
    if (xp < 0) xp = 0;
    const xpAnterior = experiencia.xp;
    const xpFinal = xpAnterior + xp;
    const { getProgressoNivel, getNivelInfo } = await import("./niveis-xp");
    const { nivel, progresso } = getProgressoNivel(xpFinal);
    const atualizado = await this.prisma.experienciaUsuario.update({
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
