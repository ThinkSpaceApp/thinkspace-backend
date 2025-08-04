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
    origem: 'TOPICOS' | 'DOCUMENTO' | 'PDF' | 'ASSUNTO';
    textoConteudo?: string;
    assunto?: string;
  }) {
    let textoBase = textoConteudo || '';
    if (origem === 'PDF' && caminhoArquivo) {
      textoBase = await this.pdfProcessor.extrairTextoDoPdf(caminhoArquivo);
    } else if (origem === 'TOPICOS' && topicos) {
      textoBase = topicos.join(', ');
    } else if (origem === 'ASSUNTO' && assunto) {
      textoBase = assunto;
    }
    if (!textoBase || textoBase.trim().length === 0) {
      throw new Error('Não foi possível obter o conteúdo base para gerar quizzes.');
    }
    const prompt = `Gere ${quantidade} questões de múltipla escolha sobre o conteúdo abaixo. Cada questão deve conter uma pergunta clara e objetiva, 4 alternativas (A, B, C, D), e indicar a alternativa correta. Formate como uma lista JSON: [{"pergunta": "...", "alternativas": ["A) ...", "B) ...", "C) ...", "D) ..."], "correta": "A"}, ...]. Não inclua comentários ou texto extra, apenas a lista JSON.`;
    const quizzesJson = await this.glm45Service.gerarTextoEducativo({
      systemPrompt: prompt,
      userPrompt: textoBase,
      maxTokens: 50000,
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
    const material = await this.prisma.materialEstudo.create({
      data: {
        titulo: nomeDesignado,
        nomeDesignado,
        materiaId,
        topicos,
        origem: origem as any,
        caminhoArquivo,
        conteudo: textoBase,
        quantidadeQuestoes: quizzes.length,
        autorId: userId,
        tipoMaterial: (tipoMaterial as TipoMaterialEstudo) || (origem as any),
        quizzesJson: JSON.stringify(quizzes),
      },
    });
    return { material, quizzes };
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
    origem: 'TOPICOS' | 'DOCUMENTO' | 'PDF';
    textoConteudo?: string;
  }) {
    let textoBase = textoConteudo || '';
    if (origem === 'PDF' && caminhoArquivo) {
      textoBase = await this.pdfProcessor.extrairTextoDoPdf(caminhoArquivo);
    } else if (origem === 'TOPICOS' && topicos) {
      textoBase = topicos.join(', ');
    }
    if (!textoBase || textoBase.trim().length === 0) {
      throw new Error('Não foi possível obter o conteúdo base para gerar flashcards.');
    }
    const prompt = `Gere ${quantidade} flashcards didáticos e objetivos sobre o tema "${nomeDesignado}" e os tópicos: ${textoBase}. Cada flashcard deve conter uma pergunta e uma resposta curta, clara e direta, sem explicações longas. Formate como uma lista JSON: [{"pergunta": "...", "resposta": "..."}, ...]. Não inclua comentários ou texto extra, apenas a lista JSON.`;
    let flashcardsJson = await this.glm45Service.gerarTextoEducativo({
      systemPrompt: prompt,
      userPrompt: '',
      maxTokens: 10000,
      temperature: 0.5,
      thinking: false,
    });
    if (flashcardsJson) {
      flashcardsJson = flashcardsJson.replace(/<think>[\s\S]*?<\/think>/gi, match => {
        const jsonMatch = match.match(/\[.*\]/s);
        return jsonMatch ? jsonMatch[0] : '';
      });
      flashcardsJson = flashcardsJson.replace(/<think>|<\/think>/gi, '').trim();
    }
    let flashcards: any[] = [];
    try {
      flashcards = JSON.parse(flashcardsJson);
    } catch {
      flashcards = [];
    }
    const material = await this.prisma.materialEstudo.create({
      data: {
        titulo: nomeDesignado,
        nomeDesignado,
        materiaId,
        topicos,
        origem: origem as any,
        caminhoArquivo,
        conteudo: textoBase,
        quantidadeFlashcards: flashcards.length,
        autorId: userId,
        tipoMaterial: (tipoMaterial as TipoMaterialEstudo) || (origem as any),
        flashcardsJson: JSON.stringify(flashcards),
      },
    });
    return { material, flashcards, respostaIaCrua: flashcardsJson };
  }

  async gerarResumoIaPorTopicos({ userId, nomeDesignado, materiaId, topicos }: {
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
        systemPrompt: `Você é um especialista em educação. Gere um texto extenso, didático e detalhado, dividido em 5 parágrafos, explicando o tema e todos os tópicos listados abaixo. O texto deve ser claro, objetivo, acessível para iniciantes e não deve incluir pensamentos, planos, tags como <think> ou estrutura de planejamento. Apenas entregue o texto final, sem introdução sobre o processo de escrita, sem mencionar o que vai fazer ou como vai estruturar. O texto deve abordar diretamente os tópicos, conectando-os de forma natural e progressiva, e pode ser ainda mais longo se necessário para cobrir o assunto de forma completa.`,
        userPrompt: textoParaResumo,
        maxTokens: 3000,
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
    },
  ) {
    if (!data.nomeDesignado || !data.materiaId || !data.topicos?.length || !data.caminhoArquivo || !data.tipoMaterial) {
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
      tipoMaterial: string;
      descricao?: string;
    },
  ) {
    if (!data.nomeDesignado || !data.materiaId || !data.topicos?.length || !data.assuntoId || !data.tipoMaterial) {
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
        tipoMaterial: data.tipoMaterial as any,
        conteudo: data.descricao,
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

      let prompt =
        `Você é um especialista em educação. Analise o texto extraído de um documento PDF abaixo e gere um resumo didático e detalhado, na mesma linguagem dos outros resumos da plataforma. Se o conteúdo for muito curto ou superficial, adicione pontos relevantes e complementares para enriquecer o material. Se o conteúdo for muito extenso, resuma de forma clara e objetiva, mantendo os pontos principais. Reescreva o texto para torná-lo mais didático e organizado. Não inclua comentários ou texto extra, apenas o resumo final.`;

      const maxTokens = 3000;

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
      
      if (!nomeDesignado || !materiaId || !topicos?.length || !assunto) {
        throw new Error("Todos os campos são obrigatórios para criar resumo por assunto.");
      }

      console.log("Montando texto base para o resumo...");
      const textoParaResumo = this.montarTextoParaResumo(assunto, topicos);
      
      if (!textoParaResumo || textoParaResumo.trim().length === 0) {
        throw new Error("Não foi possível montar o texto base para o resumo.");
      }

      console.log(`Texto base criado com ${textoParaResumo.length} caracteres`);

      console.log("Iniciando geração do resumo com IA usando GLM-4.5...");
      let resumoIA = await this.glm45Service.gerarTextoEducativo({
        systemPrompt: 'Você é um especialista em educação. Gere um texto didático e detalhado sobre o tema e tópicos abaixo.',
        userPrompt: textoParaResumo,
        maxTokens: 3000,
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

  private montarTextoParaResumo(assunto: string, topicos: string[]): string {
    const topicosFormatados = topicos.map(t => `- ${t}`).join('\n');

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

}