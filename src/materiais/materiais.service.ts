import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import { PdfProcessorService } from "./services/pdf-processor.service";
import { Glm45Service } from "./services/glm-4.5.service";
import { TipoMaterialEstudo } from "@prisma/client";

@Injectable()
export class MateriaisService {
  async extrairTextoPdf(caminhoArquivo: string): Promise<string> {
    return await this.pdfProcessor.extrairTextoDoPdf(caminhoArquivo);
  }
  async atualizarRespostasQuiz(
    materialId: string,
    userId: string,
    respostasQuiz: Record<string | number, string>,
  ) {
    const hoje = new Date();
    const material = await this.prisma.materialEstudo.findUnique({ where: { id: materialId } });
    let quizzes: any[] = [];
    try {
      quizzes = material?.quizzesJson ? JSON.parse(material.quizzesJson) : [];
    } catch {}
    for (const idx in respostasQuiz) {
      const respostaUsuario = respostasQuiz[idx];
      const quizIdx = Number(idx);
      const quiz = quizzes[quizIdx];
      let acertou = false;
      if (quiz && respostaUsuario) {
        acertou = respostaUsuario === quiz.correta;
      }
      await this.prisma.atividadeUsuario.create({
        data: {
          usuarioId: userId,
          data: hoje,
          quantidade: 1,
          acertou: acertou
        }
      });
    }
    return await this.prisma.materialEstudo.update({
      where: { id: materialId },
      data: {
        respostasQuizJson: JSON.stringify(respostasQuiz),
      },
    });
  }
  async gerarQuizzes({
    userId,
    nomeDesignado,
    materiaId,
    topicos,
    caminhoArquivo,
    tipoMaterial,
    quantidade,
    origem,
    textoConteudo,
    assunto,
  }: {
    userId: string;
    nomeDesignado: string;
    materiaId: string;
    topicos?: string[];
    caminhoArquivo?: string;
    tipoMaterial?: string;
    quantidade: number;
    origem: "TOPICOS" | "DOCUMENTO" | "PDF" | "ASSUNTO";
    textoConteudo?: string;
    assunto?: string;
  }) {
    let textoBase = textoConteudo || "";
    if (origem === "PDF" && caminhoArquivo) {
      textoBase = await this.pdfProcessor.extrairTextoDoPdf(caminhoArquivo);
    } else if (origem === "TOPICOS" && topicos) {
      textoBase = topicos.join(", ");
    } else if (origem === "ASSUNTO" && assunto) {
      textoBase = assunto;
    }
    if (!textoBase || textoBase.trim().length === 0) {
      throw new Error("Não foi possível obter o conteúdo base para gerar quizzes.");
    }
    const quantidadeMax = Math.min(quantidade, 15);
    const prompt = `Gere ${quantidadeMax} questões de múltipla escolha sobre o conteúdo abaixo. Cada questão deve conter uma pergunta clara e objetiva, 4 alternativas (A, B, C, D), e indicar a alternativa correta. Formate como uma lista JSON: [{"pergunta": "...", "alternativas": ["A) ...", "B) ...", "C) ...", "D) ..."], "correta": "A"}, ...]. Não inclua comentários ou texto extra, apenas a lista JSON.`;
    const quizzesJson = await this.glm45Service.gerarTextoEducativo({
      systemPrompt: prompt,
      userPrompt: textoBase,
      maxTokens: 55000,
      temperature: 0.5,
      thinking: false,
    });
    const match = quizzesJson.match(/\[.*\]/s);
    const jsonToParse = match ? match[0] : quizzesJson;
    let quizzes: any[] = [];
    try {
      quizzes = JSON.parse(jsonToParse);
    } catch {
      quizzes = [];
    }
    if (!materiaId) throw new Error("O parâmetro materiaId é obrigatório.");
    const material = await this.prisma.materialEstudo.findUnique({ where: { id: materiaId } });
    if (!material) throw new Error("Material não encontrado para atualizar quizzes.");
    const updatedMaterial = await this.prisma.materialEstudo.update({
      where: { id: material.id },
      data: {
        quizzesJson: JSON.stringify(quizzes),
        quantidadeQuestoes: quizzes.length,
      },
    });
    return { material: updatedMaterial, quizzes };
  }
  async gerarFlashcards({
    userId,
    nomeDesignado,
    materiaId,
    topicos,
    caminhoArquivo,
    tipoMaterial,
    quantidade,
    origem,
    textoConteudo,
  }: {
    userId: string;
    nomeDesignado: string;
    materiaId: string;
    topicos?: string[];
    caminhoArquivo?: string;
    tipoMaterial?: string;
    quantidade: number;
    origem: "TOPICOS" | "DOCUMENTO" | "PDF";
    textoConteudo?: string;
  }) {
    let textoBase = textoConteudo || "";
    if (origem === "PDF" && caminhoArquivo) {
      textoBase = await this.pdfProcessor.extrairTextoDoPdf(caminhoArquivo);
    } else if (origem === "TOPICOS" && topicos) {
      textoBase = topicos.join(", ");
    }
    if (!textoBase || textoBase.trim().length === 0) {
      throw new Error("Não foi possível obter o conteúdo base para gerar flashcards.");
    }
    const quantidadeMax = Math.min(quantidade, 15);
    const prompt = `Gere ${quantidadeMax} flashcards didáticos e objetivos sobre o tema "${nomeDesignado}" e os tópicos: ${textoBase}. Cada flashcard deve conter uma pergunta e uma resposta curta, clara e direta, sem explicações longas. Formate como uma lista JSON: [{"pergunta": "...", "resposta": "..."}, ...]. Não inclua comentários ou texto extra, apenas a lista JSON.`;
    let flashcardsJson = await this.glm45Service.gerarTextoEducativo({
      systemPrompt: prompt,
      userPrompt: "",
      maxTokens: 55000,
      temperature: 0.5,
      thinking: false,
    });
    if (flashcardsJson) {
      flashcardsJson = flashcardsJson.replace(/<think>[\s\S]*?<\/think>/gi, (match) => {
        const jsonMatch = match.match(/\[.*\]/s);
        return jsonMatch ? jsonMatch[0] : "";
      });
      flashcardsJson = flashcardsJson.replace(/<think>|<\/think>/gi, "").trim();
    }
    let flashcards: any[] = [];
    try {
      flashcards = JSON.parse(flashcardsJson);
    } catch {
      flashcards = [];
    }
    if (Array.isArray(flashcards) && typeof quantidade === "number" && quantidade > 0) {
      flashcards = flashcards.slice(0, quantidade);
    }
    const material = await this.prisma.materialEstudo.findUnique({
      where: { id: materiaId },
    });
    if (!material) throw new Error("Material não encontrado para atualizar flashcards.");
    const updatedMaterial = await this.prisma.materialEstudo.update({
      where: { id: material.id },
      data: {
        flashcardsJson: JSON.stringify(flashcards),
        quantidadeFlashcards: flashcards.length,
      },
    });
    return { material: updatedMaterial, flashcards, respostaIaCrua: flashcardsJson };
  }

  async gerarResumoIaPorTopicos({
    userId,
    nomeDesignado,
    materiaId,
    topicos,
  }: {
    userId: string;
    nomeDesignado: string;
    materiaId: string;
    topicos: string[];
  }) {
    try {
      console.log(`Iniciando geração de resumo IA por tópicos: ${nomeDesignado}`);
      if (!nomeDesignado || !materiaId || !topicos?.length) {
        throw new Error("Todos os campos são obrigatórios para gerar resumo IA por tópicos.");
      }
      console.log("Montando texto base para o resumo IA...");
      const textoParaResumo = this.montarTextoParaResumo("", topicos);
      if (!textoParaResumo || textoParaResumo.trim().length === 0) {
        throw new Error("Não foi possível montar o texto base para o resumo IA.");
      }
      console.log(`Texto base criado com ${textoParaResumo.length} caracteres`);
      console.log("Iniciando geração do resumo com IA usando GLM-4.5...");
      let resumoIA = await this.glm45Service.gerarTextoEducativo({
        systemPrompt: `Você é um especialista em educação. Gere um texto extenso, didático e detalhado, dividido em 5 parágrafos, explicando o tema e todos os tópicos listados abaixo. O texto deve ser claro, objetivo, acessível para iniciantes e formatado em Markdown, usando títulos (#), subtítulos (##), listas, negrito (**termo**), e quebras de linha (\n\n) para separar parágrafos. Todo o texto deve estar em português-br. Não inclua pensamentos, planos, tags como <think> ou estrutura de planejamento. Apenas entregue o texto final, sem introdução sobre o processo de escrita, sem mencionar o que vai fazer ou como vai estruturar. O texto deve abordar diretamente os tópicos, conectando-os de forma natural e progressiva, e pode ser ainda mais longo se necessário para cobrir o assunto de forma completa.`,
        userPrompt: textoParaResumo,
        maxTokens: 5000,
        temperature: 0.7,
        thinking: false,
      });
      if (resumoIA) {
        resumoIA = resumoIA.replace(/<think>[\s\S]*?<\/think>/g, "");
      }
      if (!resumoIA || resumoIA.trim().length === 0) {
        console.warn("Resumo vazio retornado pela IA");
      }
      console.log("Criando material no banco de dados...");
      const material = await this.prisma.materialEstudo.create({
        data: {
          titulo: nomeDesignado,
          nomeDesignado,
          materiaId,
          topicos,
          origem: "TOPICOS",
          conteudo: textoParaResumo,
          resumoIA: resumoIA || "Resumo não disponível",
          autorId: userId,
          tipoMaterial: "RESUMO_IA" as TipoMaterialEstudo,
        },
      });
      console.log(`Material criado com sucesso. ID: ${material.id}`);
      return material;
    } catch (error) {
      console.error("Erro ao gerar resumo IA por tópicos:", error);
      throw error;
    }
  }
  async buscarMaterialPorId(id: string) {
    return this.prisma.materialEstudo.findUnique({ where: { id } });
  }
  private progressoMaterial: Map<string, any> = new Map();

  async salvarProgressoMaterial(userId: string, dados: any) {
    const atual = this.progressoMaterial.get(userId) || {};
    this.progressoMaterial.set(userId, { ...atual, ...dados });
  }

  async getProgressoMaterial(userId: string) {
    return this.progressoMaterial.get(userId) || {};
  }

  async limparProgressoMaterial(userId: string) {
    this.progressoMaterial.delete(userId);
  }
  async buscarMateriaPorNome(nome: string) {
    return this.prisma.materia.findFirst({
      where: { nome },
    });
  }
  constructor(
    private readonly prisma: PrismaService,
    private readonly pdfProcessor: PdfProcessorService,
    private readonly glm45Service: Glm45Service,
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
      tipoMaterial: string;
      descricao?: string;
      quantidadeQuestoes?: number | string;
      quantidadeFlashcards?: number | string;
    },
  ) {
    if (!data.nomeDesignado || !data.materiaId || !data.topicos?.length || !data.tipoMaterial) {
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
          tipoMaterial: data.tipoMaterial as any,
          conteudo: data.descricao,
          quantidadeQuestoes: typeof data.quantidadeQuestoes === "string" ? Number(data.quantidadeQuestoes) : data.quantidadeQuestoes,
          quantidadeFlashcards: typeof data.quantidadeFlashcards === "string" ? Number(data.quantidadeFlashcards) : data.quantidadeFlashcards,
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
      tipoMaterial: string;
      descricao?: string;
      quantidadeQuestoes?: number | string;
      quantidadeFlashcards?: number | string;
    },
  ) {
    if (!data.nomeDesignado || !data.materiaId || !data.caminhoArquivo || !data.tipoMaterial) {
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
        tipoMaterial: data.tipoMaterial as any,
        conteudo: data.descricao,
        quantidadeQuestoes: typeof data.quantidadeQuestoes === "string" ? Number(data.quantidadeQuestoes) : data.quantidadeQuestoes,
        quantidadeFlashcards: typeof data.quantidadeFlashcards === "string" ? Number(data.quantidadeFlashcards) : data.quantidadeFlashcards,
      },
    });
  }

  async criarPorAssunto(
    userId: string,
    data: {
      nomeDesignado: string;
      materiaId: string;
      topicos: string[];
      assunto: string;
      tipoMaterial: string;
      descricao?: string;
      quantidadeQuestoes?: number | string;
      quantidadeFlashcards?: number | string;
    },
  ) {
    if (
      !data.nomeDesignado ||
      !data.materiaId ||
      !data.topicos?.length ||
      !data.assunto ||
      !data.tipoMaterial
    ) {
      throw new BadRequestException("Campos obrigatórios ausentes para criação por assunto.");
    }
    return this.prisma.materialEstudo.create({
      data: {
        titulo: data.nomeDesignado,
        nomeDesignado: data.nomeDesignado,
        materiaId: data.materiaId,
        topicos: data.topicos,
        origem: "ASSUNTO",
        assunto: data.assunto,
        autorId: userId,
        tipoMaterial: data.tipoMaterial as any,
        conteudo: data.assunto,
        quantidadeQuestoes: typeof data.quantidadeQuestoes === "string" ? Number(data.quantidadeQuestoes) : data.quantidadeQuestoes,
        quantidadeFlashcards: typeof data.quantidadeFlashcards === "string" ? Number(data.quantidadeFlashcards) : data.quantidadeFlashcards,
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

  let prompt = `Você é um especialista em educação. Analise o texto extraído de um documento PDF abaixo e gere um resumo didático, detalhado e envolvente, igual aos outros resumos da plataforma. O texto deve estar em português-br e formatado em Markdown, usando títulos (#), subtítulos (##), listas, tabelas (se necessário), negrito (**termo**), e quebras de linha (\n\n) para separar parágrafos. Use emojis para ilustrar ideias e tornar o conteúdo mais didático (cerca de 1 por parágrafo, sem exagero). Se o conteúdo for muito curto ou superficial, adicione pontos relevantes e complementares para enriquecer o material. Se o conteúdo for muito extenso, resuma de forma clara e objetiva, mantendo os pontos principais. Reescreva o texto para torná-lo mais didático, organizado e acessível para iniciantes. Não inclua comentários, tags <think> ou texto extra, apenas o resumo final, sem introdução sobre o processo de escrita.`;

      const maxTokens = 5000;

      let resumoIA = await this.glm45Service.gerarTextoEducativo({
        systemPrompt: prompt,
        userPrompt: textoExtraido,
        maxTokens,
        temperature: 0.7,
        thinking: true,
      });

      if (resumoIA) {
        resumoIA = resumoIA.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
      }

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
          autorId: userId,
          tipoMaterial: "DOCUMENTO" as TipoMaterialEstudo,
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
      if (!nomeDesignado || !materiaId || !assunto) {
        throw new Error("Todos os campos são obrigatórios para criar resumo por assunto.");
      }
      const textoParaResumo = assunto;
      if (!textoParaResumo || textoParaResumo.trim().length === 0) {
        throw new Error("Não foi possível montar o texto base para o resumo.");
      }
      console.log(`Texto base criado com ${textoParaResumo.length} caracteres`);
      let resumoIA = await this.glm45Service.gerarTextoEducativo({
        systemPrompt:
          "Você é um especialista em educação. Gere um texto didático e detalhado sobre o tema abaixo. O texto deve estar em português-br e formatado em Markdown, usando títulos (#), subtítulos (##), listas, negrito (**termo**), e quebras de linha (\n\n) para separar parágrafos. Use o texto fornecido como base para o resumo.",
        userPrompt: textoParaResumo,
        maxTokens: 5000,
        temperature: 0.7,
        thinking: false,
      });
      if (resumoIA) {
        resumoIA = resumoIA.replace(/<think>[\s\S]*?<\/think>/g, "");
      }
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
          tipoMaterial: TipoMaterialEstudo.RESUMO_IA,
        },
      });
      console.log(`Material criado com sucesso. ID: ${material.id}`);
      return material;
    } catch (error) {
      console.error("Erro ao criar material com resumo por assunto:", error);
      throw error;
    }
  }

  async gerarResumoIaPorMaterial(material: any) {
    const topicos = material.topicos || [];
    let textoParaResumo = "";
    if (material.origem === "ASSUNTO") {
      textoParaResumo = material.conteudo || "";
      if (topicos.length > 0) {
        textoParaResumo += `\n\nTópicos complementares: ${topicos.map((t: any) => t.nome || t).join(", ")}`;
      }
    } else {
      textoParaResumo = this.montarTextoParaResumo("", topicos);
    }
    if (!textoParaResumo || textoParaResumo.trim().length === 0) {
      throw new Error("Não foi possível montar o texto base para o resumo IA.");
    }
    let resumoIA = await this.glm45Service.gerarTextoEducativo({
      systemPrompt: `Você é um especialista em educação. Gere um texto extenso, didático e detalhado, dividido em 5 parágrafos, explicando o tema e todos os tópicos listados abaixo. O texto deve ser claro, objetivo, acessível para iniciantes e formatado em Markdown, usando títulos (#), subtítulos (##), listas, tabelas (se necessário), negrito (**termo**), e quebras de linha (\n\n) para separar parágrafos. Todo o texto deve estar em português-br. Não inclua pensamentos, planos, tags como <think> ou estrutura de planejamento. Apenas entregue o texto final, sem introdução sobre o processo de escrita, sem mencionar o que vai fazer ou como vai estruturar. O texto deve abordar diretamente os tópicos, conectando-os de forma natural e progressiva, e pode ser ainda mais longo se necessário para cobrir o assunto de forma completa.`,
      userPrompt: textoParaResumo,
      maxTokens: 5000,
      temperature: 0.7,
      thinking: false,
    });
    if (resumoIA) {
      resumoIA = resumoIA.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
      resumoIA = resumoIA.replace(/([^\n])\n([^\n])/g, "$1\n\n$2");
      resumoIA = resumoIA.replace(/\n *(#)/g, "\n$1");
      resumoIA = resumoIA.replace(/\n *([\-\*]) /g, "\n$1 ");
      if (!/^#/.test(resumoIA.trim())) {
        resumoIA = `# Resumo\n\n${resumoIA}`;
      }
    }
    if (!resumoIA || resumoIA.trim().length === 0) {
      resumoIA = "Resumo não disponível";
    }
    const updatedMaterial = await this.prisma.materialEstudo.update({
      where: { id: material.id },
      data: {
        resumoIA,
      },
    });
    return { material: updatedMaterial, resumoIA };
  }

  async gerarFlashcardsIaPorMaterial(material: any) {
    const topicos = material.topicos || [];
    let textoBase = "";
    if (material.origem === "ASSUNTO") {
      textoBase = material.conteudo || "";
      if (topicos.length > 0) {
        textoBase += `\n\nTópicos complementares: ${topicos.map((t: any) => t.nome || t).join(", ")}`;
      }
    } else {
      textoBase =
        topicos.length > 0
          ? topicos.map((t: any) => t.nome || t).join(", ")
          : material.conteudo || "";
    }
    if (!textoBase || textoBase.trim().length === 0) {
      throw new Error("Não foi possível obter o conteúdo base para gerar flashcards.");
    }
    const quantidade = material.quantidadeFlashcards || 10;
    const prompt = `Gere ${quantidade} flashcards didáticos e objetivos sobre o tema e tópicos abaixo. Cada flashcard deve conter uma pergunta e uma resposta curta, clara e direta, sem explicações longas. Formate como uma lista JSON: [{"pergunta": "...", "resposta": "..."}, ...]. Não inclua comentários ou texto extra, apenas a lista JSON.`;
    let flashcardsJson = await this.glm45Service.gerarTextoEducativo({
      systemPrompt: prompt,
      userPrompt: textoBase,
      maxTokens: 55000,
      temperature: 0.5,
      thinking: false,
    });
    if (flashcardsJson) {
      flashcardsJson = flashcardsJson.replace(/<think>[\s\S]*?<\/think>/gi, (match) => {
        const jsonMatch = match.match(/\[.*\]/s);
        return jsonMatch ? jsonMatch[0] : "";
      });
      flashcardsJson = flashcardsJson.replace(/<think>|<\/think>/gi, "").trim();
    }
    let flashcards: any[] = [];
    try {
      flashcards = JSON.parse(flashcardsJson);
    } catch {
      flashcards = [];
    }
    const updateData: any = {
      flashcardsJson: JSON.stringify(flashcards),
    };
    if (flashcards.length > 0) {
      updateData.quantidadeFlashcards = flashcards.length;
    }
    const updatedMaterial = await this.prisma.materialEstudo.update({
      where: { id: material.id },
      data: updateData,
    });
    return { material: updatedMaterial, flashcards };
  }

  async gerarQuizzesIaPorMaterial(material: any) {
    const topicos = material.topicos || [];
    let textoBase = "";
    if (material.origem === "ASSUNTO") {
      textoBase = material.conteudo || "";
      if (topicos.length > 0) {
        textoBase += `\n\nTópicos complementares: ${topicos.map((t: any) => t.nome || t).join(", ")}`;
      }
    } else {
      textoBase =
        topicos.length > 0
          ? topicos.map((t: any) => t.nome || t).join(", ")
          : material.conteudo || "";
    }
    if (!textoBase || textoBase.trim().length === 0) {
      throw new Error("Não foi possível obter o conteúdo base para gerar quizzes.");
    }
    const quantidade = material.quantidadeQuestoes || 10;
    const prompt = `Gere ${quantidade} questões de múltipla escolha sobre o tema e tópicos abaixo. Cada questão deve conter uma pergunta clara e objetiva, 4 alternativas (A, B, C, D), e indicar a alternativa correta. Formate como uma lista JSON: [{"pergunta": "...", "alternativas": ["A) ...", "B) ...", "C) ...", "D) ..."], "correta": "A"}, ...]. Não inclua comentários ou texto extra, apenas a lista JSON.`;
    let quizzesJson = await this.glm45Service.gerarTextoEducativo({
      systemPrompt: prompt,
      userPrompt: textoBase,
      maxTokens: 55000,
      temperature: 0.5,
      thinking: false,
    });
    if (quizzesJson) {
      quizzesJson = quizzesJson.replace(/<think>[\s\S]*?<\/think>/gi, (match) => {
        const jsonMatch = match.match(/\[.*\]/s);
        return jsonMatch ? jsonMatch[0] : "";
      });
      quizzesJson = quizzesJson.replace(/<think>|<\/think>/gi, "").trim();
    }
    let quizzes: any[] = [];
    try {
      quizzes = JSON.parse(quizzesJson);
    } catch {
      quizzes = [];
    }
    const updateData: any = {
      quizzesJson: JSON.stringify(quizzes),
    };
    if (quizzes.length > 0) {
      updateData.quantidadeQuestoes = quizzes.length;
    }
    const updatedMaterial = await this.prisma.materialEstudo.update({
      where: { id: material.id },
      data: updateData,
    });
    return { material: updatedMaterial, quizzes };
  }

  async gerarQuizzesIaPorPdfMaterial(material: any, caminhoArquivo?: string) {
    const pdfPath = caminhoArquivo || material.caminhoArquivo;
    if (!pdfPath) {
      throw new Error("O material não possui PDF armazenado.");
    }
    const textoBase = await this.pdfProcessor.extrairTextoDoPdf(pdfPath);
    if (!textoBase || textoBase.trim().length === 0) {
      throw new Error("Não foi possível extrair texto do PDF para gerar quizzes.");
    }
    const quantidade = material.quantidadeQuestoes || 10;
    const prompt = `Gere ${quantidade} questões de múltipla escolha sobre o conteúdo abaixo extraído de um PDF. Cada questão deve conter uma pergunta clara e objetiva, 4 alternativas (A, B, C, D), e indicar a alternativa correta. Formate como uma lista JSON: [{"pergunta": "...", "alternativas": ["A) ...", "B) ...", "C) ...", "D) ..."], "correta": "A"}, ...]. Não inclua comentários ou texto extra, apenas a lista JSON.`;
    let quizzesJson = await this.glm45Service.gerarTextoEducativo({
      systemPrompt: prompt,
      userPrompt: textoBase,
      maxTokens: 55000,
      temperature: 0.5,
      thinking: false,
    });
    if (quizzesJson) {
      quizzesJson = quizzesJson.replace(/<think>[\s\S]*?<\/think>/gi, (match) => {
        const jsonMatch = match.match(/\[.*\]/s);
        return jsonMatch ? jsonMatch[0] : "";
      });
      quizzesJson = quizzesJson.replace(/<think>|<\/think>/gi, "").trim();
    }
    let quizzes: any[] = [];
    try {
      quizzes = JSON.parse(quizzesJson);
    } catch {
      quizzes = [];
    }
    const updateData: any = {
      quizzesJson: JSON.stringify(quizzes),
    };
    if (quizzes.length > 0) {
      updateData.quantidadeQuestoes = quizzes.length;
    }
    const updatedMaterial = await this.prisma.materialEstudo.update({
      where: { id: material.id },
      data: updateData,
    });
    return { material: updatedMaterial, quizzes };
  }

  private montarTextoParaResumo(assunto: string, topicos: string[]): string {
    const topicosFormatados = topicos.map((t) => `- ${t}`).join("\n");

    return `

Você é um educador didático e envolvente. Escreva um texto explicando o tema abaixo de forma clara, acessível e interessante para estudantes do ensino médio. 

O texto deve:

- Ter **um título principal** e **subtítulos explicativos** para cada parte.
- Ser dividido em **5 seções**, conectadas de forma progressiva.
- Usar **exemplos simples**, analogias quando necessário, e **emojis para ilustrar ideias** (sem exagero, cerca de 1 por parágrafo).
- **Evitar linguagem rebuscada**, mas sem ser informal demais.
- Não repetir os tópicos literalmente, mas abordar todos de forma integrada e fluida.

---


Tema: ${assunto}
Tópicos:
${topicosFormatados}
`;
  }

  async gerarRespostaTutorIa({ prompt }: { prompt: string }) {
    let resposta = await this.glm45Service.gerarTextoEducativo({
      systemPrompt: prompt,
      userPrompt: "",
      maxTokens: 10000,
      temperature: 0.7,
      thinking: false,
    });
    if (resposta) {
      resposta = resposta
        .replace(/<think>/gi, "")
        .replace(/<\/think>/gi, "")
        .trim();
    }
    if (!resposta || resposta === "") {
      resposta =
        "Desculpe, não consegui gerar uma resposta no momento. Tente novamente ou reformule sua pergunta.";
    }
    return resposta;
  }

  async atualizarChatHistory(materialId: string, chatHistory: any[]) {
    await this.prisma.materialEstudo.update({
      where: { id: materialId },
      data: { chatHistoryJson: chatHistory },
    });
  }

  async gerarResumoIaPorPdfMaterial(material: any, caminhoArquivo?: string) {
    const pdfPath = caminhoArquivo || material.caminhoArquivo;
    if (!pdfPath) {
      throw new Error("O material não possui PDF armazenado.");
    }
    const textoBase = await this.pdfProcessor.extrairTextoDoPdf(pdfPath);
    if (!textoBase || textoBase.trim().length === 0) {
      throw new Error("Não foi possível extrair texto do PDF para gerar resumo.");
    }
  const markdownPrompt = `Você é um educador didático e envolvente. Escreva um texto explicando o conteúdo extraído de um PDF de forma clara, acessível e interessante para estudantes do ensino médio.\n\nO texto deve:\n\n- Ter **um título principal** e **subtítulos explicativos** para cada parte.\n- Ser dividido em **5 seções**, conectadas de forma progressiva.\n- Usar **exemplos simples**, analogias quando necessário, e **emojis para ilustrar ideias** (sem exagero, cerca de 1 por parágrafo).\n- **Evitar linguagem rebuscada**, mas sem ser informal demais.\n- Não repetir os tópicos literalmente, mas abordar todos de forma integrada e fluida.\n\nO texto deve estar em português-br e ser formatado em Markdown, usando títulos (#), subtítulos (##), listas, negrito (**termo**), e quebras de linha (\\n\\n) para separar parágrafos. Não inclua pensamentos, planos, tags como <think> ou estrutura de planejamento. Apenas entregue o texto final, sem introdução sobre o processo de escrita, sem mencionar o que vai fazer ou como vai estruturar.`;
  const prompt = markdownPrompt;
    let resumoIA = await this.glm45Service.gerarTextoEducativo({
      systemPrompt: markdownPrompt,
      userPrompt: textoBase,
      maxTokens: 5000,
      temperature: 0.7,
      thinking: false,
    });
    if (resumoIA) {
      resumoIA = resumoIA.replace(/<think>[\s\S]*?<\/think>/g, "");
    }
    if (!resumoIA || resumoIA.trim().length === 0) {
      resumoIA = "Resumo não disponível";
    }
    const updatedMaterial = await this.prisma.materialEstudo.update({
      where: { id: material.id },
      data: {
        resumoIA,
      },
    });
    return { material: updatedMaterial, resumoIA };
  }

  async gerarFlashcardsIaPorPdfMaterial(material: any, caminhoArquivo?: string) {
    const pdfPath = caminhoArquivo || material.caminhoArquivo;
    if (!pdfPath) {
      throw new Error("O material não possui PDF armazenado.");
    }
    const textoBase = await this.pdfProcessor.extrairTextoDoPdf(pdfPath);
    if (!textoBase || textoBase.trim().length === 0) {
      throw new Error("Não foi possível extrair texto do PDF para gerar flashcards.");
    }
    const quantidade = material.quantidadeFlashcards || 10;
    const prompt = `Gere ${quantidade} flashcards didáticos e objetivos sobre o conteúdo abaixo extraído de um PDF. Cada flashcard deve conter uma pergunta e uma resposta curta, clara e direta, sem explicações longas. Formate como uma lista JSON: [{"pergunta": "...", "resposta": "..."}, ...]. Não inclua comentários ou texto extra, apenas a lista JSON.`;
    let flashcardsJson = await this.glm45Service.gerarTextoEducativo({
      systemPrompt: prompt,
      userPrompt: textoBase,
      maxTokens: 55000,
      temperature: 0.5,
      thinking: false,
    });
    if (flashcardsJson) {
      flashcardsJson = flashcardsJson.replace(/<think>[\s\S]*?<\/think>/gi, (match) => {
        const jsonMatch = match.match(/\[.*\]/s);
        return jsonMatch ? jsonMatch[0] : "";
      });
      flashcardsJson = flashcardsJson.replace(/<think>|<\/think>/gi, "").trim();
    }
    let flashcards: any[] = [];
    try {
      flashcards = JSON.parse(flashcardsJson);
    } catch {
      flashcards = [];
    }
    const updateData: any = {
      flashcardsJson: JSON.stringify(flashcards),
    };
    if (flashcards.length > 0) {
      updateData.quantidadeFlashcards = flashcards.length;
    }
    const updatedMaterial = await this.prisma.materialEstudo.update({
      where: { id: material.id },
      data: updateData,
    });
    return { material: updatedMaterial, flashcards };
  }

  async salvarChatMensagem({
    materialId,
    autorId,
    mensagemUsuario,
    mensagemIa,
  }: {
    materialId: string;
    autorId: string;
    mensagemUsuario: string;
    mensagemIa: string;
  }) {
    return await this.prisma.chatMensagem.create({
      data: {
        materialId,
        autorId,
        mensagemUsuario,
        mensagemIa,
        horarioMensagem: new Date(),
      },
    });
  }

  async buscarMensagensChatboxUsuario({
    materialId,
    autorId,
  }: {
    materialId: string;
    autorId: string;
  }) {
    return await this.prisma.chatMensagem.findMany({
      where: {
        materialId,
        autorId,
      },
      orderBy: {
        horarioMensagem: "asc",
      },
    });
  }
}
