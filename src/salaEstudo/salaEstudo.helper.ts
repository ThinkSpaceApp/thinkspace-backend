import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class SalaEstudoHelperService {
  constructor(private readonly prisma: PrismaService) {}

  async getSalasDoUsuario(usuarioId: string) {
    const membroSalas = await this.prisma.membroSala.findMany({
      where: { usuarioId },
      select: { salaId: true },
    });
    return membroSalas.map((m) => m.salaId);
  }
}
