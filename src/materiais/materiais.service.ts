import { Injectable, NotFoundException, ForbiddenException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class MateriaisService {
  constructor(private readonly prisma: PrismaService) {}

  //   async listarPorUsuario(userId: string) {
  //     return this.prisma.materialEstudo.findMany({
  //       where: { usuarioId: userId },
  //       orderBy: { criadoEm: "desc" },
  //     });
  //   }

  //   async obterPorId(id: string, userId: string) {
  //     const material = await this.prisma.materialEstudo.findUnique({ where: { id } });
  //     if (!material) throw new NotFoundException("Material não encontrado.");
  //     if (material.usuarioId !== userId) throw new ForbiddenException("Acesso negado.");
  //     return material;
  //   }

  //   async criar(userId: string, data: { nome: string; descricao?: string; url?: string }) {
  //     return this.prisma.materialEstudo.create({
  //       data: {
  //         nome: data.nome,
  //         descricao: data.descricao ?? "",
  //         url: data.url ?? "",
  //         usuarioId: userId,
  //       },
  //     });
  //   }

  //   async editar(id: string, userId: string, data: { nome?: string; descricao?: string; url?: string }) {
  //     const material = await this.obterPorId(id, userId);
  //     return this.prisma.materialEstudo.update({
  //       where: { id },
  //       data: {
  //         ...(data.nome && { nome: data.nome }),
  //         ...(data.descricao && { descricao: data.descricao }),
  //         ...(data.url && { url: data.url }),
  //       },
  //     });
  //   }

  //   async excluir(id: string, userId: string) {
  //     const material = await this.obterPorId(id, userId);
  //     return this.prisma.materialEstudo.delete({ where: { id } });
  //   }
}
