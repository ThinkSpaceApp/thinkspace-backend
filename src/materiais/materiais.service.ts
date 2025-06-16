import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import pdfParse from "pdf-parse";
import axios from "axios";

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
    },
  ) {
    if (!data.nomeDesignado || !data.materiaId || !data.topicos?.length) {
      throw new BadRequestException("Campos obrigatórios ausentes para criação por tópicos.");
    }

    try {
      return await this.prisma.materialEstudo.create({
        data: {
          titulo: data.nomeDesignado,
          nomeDesignado: data.nomeDesignado,
          materiaId: data.materiaId,
          topicos: data.topicos,
          origem: "TOPICOS",
          autorId: userId,
        },
      });
    } catch (error) {
      if (
        error instanceof PrismaClientKnownRequestError &&
        error.code === "P2003" &&
        typeof error.meta?.field_name === "string" &&
        error.meta.field_name.includes("materiaId")
      ) {
        throw new BadRequestException("Matéria informada não existe.");
      }
      throw error;
    }
  }

  async criarPorDocumento(
    userId: string,
    data: {
      nomeDesignado: string;
      materiaId: string;
      topicos: string[];
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
      },
    });
  }

  async excluir(id: string, userId: string) {
    await this.obterPorId(id, userId);
    return this.prisma.materialEstudo.delete({ where: { id } });
  }

  async criarMaterialComPdf({
    userId,
    nomeDesignado,
    materiaId,
    topicos,
    caminhoArquivo,
  }: {
    userId: string;
    nomeDesignado: string;
    materiaId: string;
    topicos: string[];
    caminhoArquivo: string;
  }) {
    const fs = await import("fs/promises");
    const pdfData = await pdfParse(await fs.readFile(caminhoArquivo));
    const textoExtraido = pdfData.text;

    const huggingFaceApiKey = process.env.HUGGINGFACE_API_KEY;
    if (!huggingFaceApiKey) throw new Error("HUGGINGFACE_API_KEY não configurada.");

    const huggingFaceModel = "csebuetnlp/mT5_multilingual_XLSum";

    async function gerarResumo(texto: string): Promise<string> {
      try {
        const hfResponse = await axios.post(
          `https://api-inference.huggingface.co/models/${huggingFaceModel}`,
          { inputs: texto },
          {
            headers: {
              Authorization: `Bearer ${huggingFaceApiKey}`,
              "Content-Type": "application/json",
            },
            timeout: 90000,
          },
        );

        if (Array.isArray(hfResponse.data)) {
          return hfResponse.data[0]?.summary_text || "";
        }

        if (hfResponse.data?.error) {
          throw new Error(`Erro HuggingFace: ${hfResponse.data.error}`);
        }

        return hfResponse.data?.summary_text || "";
      } catch (err) {
        console.error("Erro ao gerar resumo:", err);
        return "";
      }
    }

    const limiteTokens = 4000;
    const partes = textoExtraido.match(new RegExp(`(.|\\s){1,${limiteTokens}}`, "g")) || [];

    const resumosParciais: string[] = [];

    for (const parte of partes) {
      const resumo = await gerarResumo(parte);
      resumosParciais.push(resumo);
    }

    const resumoFinal =
      resumosParciais.length > 1
        ? await gerarResumo(resumosParciais.join(" "))
        : resumosParciais[0] || "";

    return this.prisma.materialEstudo.create({
      data: {
        titulo: nomeDesignado,
        nomeDesignado,
        materiaId,
        topicos,
        origem: "DOCUMENTO",
        caminhoArquivo,
        conteudo: textoExtraido,
        resumoIA: resumoFinal,
        autorId: userId,
      },
    });
  }
}
