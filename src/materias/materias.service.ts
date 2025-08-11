// import { Injectable, BadRequestException } from "@nestjs/common";
// import { PrismaService } from "../prisma/prisma.service";

// @Injectable()
// export class MateriasService {
//   constructor(private readonly prisma: PrismaService) {}

//   async getInformacoesMateria(materiaId: string, usuarioId: string) {
//     const materia = await this.prisma.materia.findUnique({
//       where: { id: materiaId },
//       include: { materiais: true },
//     });
//     if (!materia || materia.usuarioId !== usuarioId) {
//       throw new BadRequestException("Matéria não encontrada ou não pertence ao usuário.");
//     }
//     const quantidadeMateriais = Array.isArray(materia.materiais) ? materia.materiais.length : 0;
//     const tempoAtivo = materia.tempoAtivo || 0;
//     const ultimaRevisao = materia.ultimaRevisao || null;
//     return {
//       quantidadeMateriais,
//       tempoAtivo,
//       ultimaRevisao,
//     };
//   }

//   async atualizarTempoAtivoEMarcarRevisao(materiaId: string, usuarioId: string, minutos: number) {
//     const materia = await this.prisma.materia.findUnique({ where: { id: materiaId } });
//     if (!materia || materia.usuarioId !== usuarioId) {
//       throw new BadRequestException("Matéria não encontrada ou não pertence ao usuário.");
//     }
//     return await this.prisma.materia.update({
//       where: { id: materiaId },
//       data: {
//         tempoAtivo: { increment: minutos },
//         ultimaRevisao: new Date(),
//       },
//     });
//   }
// }