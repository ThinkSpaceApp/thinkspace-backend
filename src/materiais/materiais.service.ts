import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import { PdfProcessorService } from "./services/pdf-processor.service";

@Injectable()
export class MateriaisService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pdfProcessor: PdfProcessorService,
  ) {}

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

  async processarPdfEgerarResumo({
    userId,
    nomeDesignado,
    materiaId,
    topicos,
    caminhoArquivo,
    descricao,
    nomeArquivo,
  }: {
    userId: string;
    nomeDesignado: string;
    materiaId: string;
    topicos: string[];
    caminhoArquivo: string;
    descricao?: string;
    nomeArquivo: string;
  }) {
    try {
      console.log(`Iniciando processamento do PDF: ${nomeArquivo}`);
      const textoExtraido = await this.pdfProcessor.extrairTextoDoPdf(caminhoArquivo);
      
      if (!textoExtraido || textoExtraido.trim().length === 0) {
        throw new Error("Não foi possível extrair texto do PDF. Verifique se o arquivo é válido.");
      }

      console.log(`Texto extraído com sucesso. Tamanho: ${textoExtraido.length} caracteres`);

      console.log("Iniciando geração do resumo com IA...");
      const resumoIA = await this.pdfProcessor.gerarResumoComIA(textoExtraido);
      
      if (!resumoIA || resumoIA.trim().length === 0) {
        console.warn("Não foi possível gerar resumo com IA. Continuando sem resumo.");
      }

      console.log("Criando material no banco de dados...");
      const material = await this.prisma.materialEstudo.create({
        data: {
          titulo: nomeDesignado,
          nomeDesignado,
          materiaId,
          topicos,
          origem: "DOCUMENTO",
          caminhoArquivo,
          conteudo: textoExtraido,
          resumoIA: resumoIA || "Resumo não disponível",
          // descricao: descricao,
          autorId: userId,
        },
      });

      console.log(`Material criado com sucesso. ID: ${material.id}`);
      return material;

    } catch (error) {
      console.error("Erro ao processar PDF:", error);
      throw error;
    }
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
    return this.processarPdfEgerarResumo({
      userId,
      nomeDesignado,
      materiaId,
      topicos,
      caminhoArquivo,
      nomeArquivo: "arquivo.pdf",
    });
  }

  async criarMaterialComResumoAssunto({
    userId,
    nomeDesignado,
    materiaId,
    topicos,
    assunto,
  }: {
    userId: string;
    nomeDesignado: string;
    materiaId: string;
    topicos: string[];
    assunto: string;
  }) {
    try {
      console.log(`Iniciando criação de resumo por assunto: ${nomeDesignado}`);
      
      if (!nomeDesignado || !materiaId || !topicos?.length || !assunto) {
        throw new Error("Todos os campos são obrigatórios para criar resumo por assunto.");
      }

      console.log("Montando texto base para o resumo...");
      const textoParaResumo = this.montarTextoParaResumo(assunto, topicos);
      
      if (!textoParaResumo || textoParaResumo.trim().length === 0) {
        throw new Error("Não foi possível montar o texto base para o resumo.");
      }

      console.log(`Texto base criado com ${textoParaResumo.length} caracteres`);

      console.log("Iniciando geração do resumo com IA...");
      const resumoIA = await this.gerarResumoPorAssunto(textoParaResumo);
      
      if (!resumoIA || resumoIA.trim().length === 0) {
        console.warn("Não foi possível gerar resumo com IA. Continuando sem resumo.");
      }

      console.log("Criando material no banco de dados...");
      const material = await this.prisma.materialEstudo.create({
        data: {
          titulo: nomeDesignado,
          nomeDesignado,
          materiaId,
          topicos,
          origem: "ASSUNTO",
          conteudo: textoParaResumo,
          resumoIA: resumoIA || "Resumo não disponível",
          autorId: userId,
        },
      });

      console.log(`Material criado com sucesso. ID: ${material.id}`);
      return material;

    } catch (error) {
      console.error("Erro ao criar material com resumo por assunto:", error);
      throw error;
    }
  }

  private montarTextoParaResumo(assunto: string, topicos: string[]): string {
    const topicosFormatados = topicos.map(t => `- ${t}`).join('\n');
    
    return `Assunto: ${assunto}

Tópicos abordados:
${topicosFormatados}

Contexto: Este material aborda o tema "${assunto}" com foco nos seguintes tópicos: ${topicos.join(', ')}.

Desenvolvimento: O conteúdo será estruturado de forma didática, abordando cada tópico de maneira clara e objetiva, fornecendo informações relevantes e contextualizadas sobre ${assunto}.`;
  }

  private async gerarResumoPorAssunto(texto: string): Promise<string> {
    const apiKey = process.env.HUGGINGFACE_API_KEY;
    
    if (!apiKey) {
      console.warn("HUGGINGFACE_API_KEY não configurada. Pulando geração de resumo.");
      return "";
    }

    try {
      console.log("Gerando resumo por assunto com IA...");
      
      const modelo = "csebuetnlp/mT5_multilingual_XLSum";
      
      const textoLimitado = texto.slice(0, 4000);
      
      const resumo = await this.pdfProcessor.chamarAPIHuggingFace(modelo, textoLimitado);
      
      if (resumo && resumo.trim().length > 0) {
        console.log("Resumo gerado com sucesso");
        return resumo;
      } else {
        console.warn("Resumo vazio retornado pela IA");
        return "";
      }

    } catch (error) {
      console.error(`Erro ao gerar resumo por assunto: ${error instanceof Error ? error.message : String(error)}`);
      return "Erro ao gerar resumo com IA.";
    }
  }
}
