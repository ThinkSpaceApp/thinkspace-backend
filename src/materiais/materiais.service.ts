import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { OrigemMaterial, TipoMaterial } from "@prisma/client";

@Injectable()
export class MateriaisService {
  constructor(private readonly prisma: PrismaService) {}

  async listarPorUsuario(userId: string) {
    return this.prisma.materialEstudo.findMany({
      where: { autorId: userId },
      orderBy: { criadoEm: "desc" },
    });
  }

  async obterPorId(id: string, userId: string) {
    const material = await this.prisma.materialEstudo.findUnique({ where: { id } });
    if (!material) throw new NotFoundException("Material não encontrado.");
    if (material.autorId !== userId) throw new ForbiddenException("Acesso negado.");
    return material;
  }

  async criarPorTopicos(
    userId: string,
    data: {
      nomeDesignado: string;
      materiaId: string;
      topicos: string[];
      tipo: TipoMaterial;
    },
  ) {
    if (!data.nomeDesignado || !data.materiaId || !data.topicos?.length) {
      throw new BadRequestException("Campos obrigatórios ausentes para criação por tópicos.");
    }
    return this.prisma.materialEstudo.create({
      data: {
        titulo: data.nomeDesignado,
        nomeDesignado: data.nomeDesignado,
        materiaId: data.materiaId,
        topicos: data.topicos,
        tipo: data.tipo,
        origem: "TOPICOS",
        autorId: userId,
      },
    });
  }

  async criarPorDocumento(
    userId: string,
    data: {
      nomeDesignado: string;
      materiaId: string;
      topicos: string[];
      tipo: TipoMaterial;
      caminhoArquivo: string;
    },
  ) {
    if (!data.nomeDesignado || !data.materiaId || !data.topicos?.length || !data.caminhoArquivo) {
      throw new BadRequestException("Campos obrigatórios ausentes para criação por documento.");
    }
    return this.prisma.materialEstudo.create({
      data: {
        titulo: data.nomeDesignado,
        nomeDesignado: data.nomeDesignado,
        materiaId: data.materiaId,
        topicos: data.topicos,
        tipo: data.tipo,
        origem: "DOCUMENTO",
        caminhoArquivo: data.caminhoArquivo,
        autorId: userId,
      },
    });
  }

  async criarPorAssunto(
    userId: string,
    data: {
      nomeDesignado: string;
      materiaId: string;
      topicos: string[];
      tipo: TipoMaterial;
      assuntoId: string;
    },
  ) {
    if (!data.nomeDesignado || !data.materiaId || !data.topicos?.length || !data.assuntoId) {
      throw new BadRequestException("Campos obrigatórios ausentes para criação por assunto.");
    }
    return this.prisma.materialEstudo.create({
      data: {
        titulo: data.nomeDesignado,
        nomeDesignado: data.nomeDesignado,
        materiaId: data.materiaId,
        topicos: data.topicos,
        tipo: data.tipo,
        origem: "ASSUNTO",
        assuntoId: data.assuntoId,
        autorId: userId,
      },
    });
  }

  async editar(
    id: string,
    userId: string,
    data: {
      nomeDesignado?: string;
      topicos?: string[];
      caminhoArquivo?: string;
      assuntoId?: string;
      tipo?: TipoMaterial;
    },
  ) {
    const material = await this.obterPorId(id, userId);
    return this.prisma.materialEstudo.update({
      where: { id },
      data: {
        ...(data.nomeDesignado && {
          nomeDesignado: data.nomeDesignado,
          titulo: data.nomeDesignado,
        }),
        ...(data.topicos && { topicos: data.topicos }),
        ...(data.caminhoArquivo && { caminhoArquivo: data.caminhoArquivo }),
        ...(data.assuntoId && { assuntoId: data.assuntoId }),
        ...(data.tipo && { tipo: data.tipo }),
      },
    });
  }

  async excluir(id: string, userId: string) {
    await this.obterPorId(id, userId);
    return this.prisma.materialEstudo.delete({ where: { id } });
  }
}
