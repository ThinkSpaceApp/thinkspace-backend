  import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Req,
  UseGuards,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  UseInterceptors,
  UploadedFile,
} from "@nestjs/common";
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
} from "@nestjs/swagger";
import { Request } from "express";
import { AuthGuard } from "@nestjs/passport";
import { MateriaisService } from "./materiais.service";
import { FileInterceptor } from "@nestjs/platform-express";
import { MulterOptions } from "@nestjs/platform-express/multer/interfaces/multer-options.interface";
import { OrigemMaterial } from "@prisma/client";
import { uploadPdfConfig } from "./config/upload.config";

@ApiTags("Materiais")
@ApiBearerAuth()
@UseGuards(AuthGuard("jwt"))
@Controller("materiais")
export class MateriaisController {
  constructor(private readonly materiaisService: MateriaisService) {}

  @ApiOperation({ summary: "Etapa 1 - Selecionar origem do material" })
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        origem: { type: "string", enum: ["TOPICOS", "DOCUMENTO", "ASSUNTO"] },
      },
      required: ["origem"],
    },
  })
  @ApiResponse({ status: 200, description: "Origem selecionada com sucesso." })

  @Post("escolha-origem-material")
  async etapaOrigem(@Req() req: Request, @Body() body: any) {
    const origensValidas = ["TOPICOS", "DOCUMENTO", "ASSUNTO"];
    if (!body || typeof body !== "object" || !body.origem) {
      throw new BadRequestException("Campo origem obrigatório.");
    }
    if (!origensValidas.includes(body.origem)) {
      throw new BadRequestException(`A origem deve ser uma das seguintes: ${origensValidas.join(", ")}`);
    }
    const userId = (req.user as any).userId;
    await this.materiaisService.salvarProgressoMaterial(userId, { origem: body.origem });
    return { message: "Origem do material escolhida com sucesso.", origem: body.origem };
  }


  @ApiOperation({ summary: "Etapa 2 - Selecionar tipo do material" })
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        tipoMaterial: { type: "string", enum: ["QUIZZ", "FLASHCARD", "RESUMO_IA", "COMPLETO"] },
      },
      required: ["tipoMaterial"],
    },
  })
  @ApiResponse({ status: 200, description: "Tipo de material selecionado com sucesso." })

  @Post("escolha-tipo-material")
  async etapaTipo(@Req() req: Request, @Body() body: any) {
    const tiposValidos = ["QUIZZ", "FLASHCARD", "RESUMO_IA", "COMPLETO"];
    if (!body || typeof body !== "object" || !body.tipoMaterial) {
      throw new BadRequestException("Campo tipoMaterial obrigatório.");
    }
    if (!tiposValidos.includes(body.tipoMaterial)) {
      throw new BadRequestException(`O tipoMaterial deve ser um dos seguintes: ${tiposValidos.join(", ")}`);
    }
    const userId = (req.user as any).userId;
    await this.materiaisService.salvarProgressoMaterial(userId, { tipoMaterial: body.tipoMaterial });
    return { message: "Tipo de material escolhido com sucesso.", tipoMaterial: body.tipoMaterial };
  }


  @ApiOperation({ summary: "Etapa 3 - Dados básicos do material" })
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        nomeDesignado: { type: "string" },
        nomeMateria: { type: "string", description: "Nome da matéria. O backend irá alocar pelo nome." },
        topicos: { type: "array", items: { type: "string" } },
        assuntoId: { type: "string" },
        descricao: { type: "string" },
        quantidadeQuestoes: { type: "number", example: 10, description: "Número de questões para quizzes (máx 25)" },
        quantidadeFlashcards: { type: "number", example: 10, description: "Número de flashcards (máx 25)" },
      },
      required: ["nomeDesignado", "nomeMateria", "topicos"],
    },
  })
  
  @Post("etapa-dados")
  async etapaDados(@Req() req: Request, @Body() body: any) {
    if (!body.nomeDesignado || !body.nomeMateria || !body.topicos?.length) {
      throw new BadRequestException("Nome designado, nome da matéria e tópicos são obrigatórios.");
    }
    if (!body.tipoMaterial) {
      throw new BadRequestException("O tipo do material deve ser informado nesta etapa.");
    }

    const materia = await this.materiaisService.buscarMateriaPorNome(body.nomeMateria);
    if (!materia) {
      throw new BadRequestException("Matéria não encontrada pelo nome informado.");
    }
    const materiaId = materia.id;

    if (body.tipoMaterial === "QUIZZ") {
      if (typeof body.quantidadeQuestoes !== "number" || body.quantidadeQuestoes < 1 || body.quantidadeQuestoes > 25) {
        throw new BadRequestException("Para quizzes, informe quantidadeQuestoes entre 1 e 25.");
      }
    }
    if (body.tipoMaterial === "FLASHCARD") {
      if (typeof body.quantidadeFlashcards !== "number" || body.quantidadeFlashcards < 1 || body.quantidadeFlashcards > 25) {
        throw new BadRequestException("Para flashcards, informe quantidadeFlashcards entre 1 e 25.");
      }
    }
    if (body.tipoMaterial === "COMPLETO") {
      if (typeof body.quantidadeQuestoes !== "number" || body.quantidadeQuestoes < 1 || body.quantidadeQuestoes > 25) {
        throw new BadRequestException("Para completo, informe quantidadeQuestoes entre 1 e 25.");
      }
      if (typeof body.quantidadeFlashcards !== "number" || body.quantidadeFlashcards < 1 || body.quantidadeFlashcards > 25) {
        throw new BadRequestException("Para completo, informe quantidadeFlashcards entre 1 e 25.");
      }
    }

    const userId = (req.user as any).userId;
    await this.materiaisService.salvarProgressoMaterial(userId, { ...body, materiaId });
    if (body.origem === "DOCUMENTO") {
      return { message: "Dados básicos recebidos. Aguarde o upload do PDF.", etapa: 3, dados: { ...body, materiaId } };
    } else {
      const progresso = await this.materiaisService.getProgressoMaterial(userId);
      const materialCriado = await this.materiaisService.criarPorTopicos(userId, progresso);
      await this.materiaisService.limparProgressoMaterial(userId);
      return { message: "Material criado com sucesso.", etapa: 3, material: materialCriado };
    }
  }


  @ApiOperation({ summary: "Status do serviço de materiais" })
  @ApiResponse({ status: 200, description: "Servidor de materiais ativo!" })
  @Get("/")
  getStatus() {
    return { status: "Servidor de materiais ativo!" };
  }

  @ApiOperation({ summary: "Listar materiais do usuário" })
  @ApiResponse({ status: 200, description: "Materiais encontrados com sucesso." })
  @Get()
  async listarMateriais(@Req() req: Request) {
    const materiais = await this.materiaisService.listarPorUsuario((req.user as any).userId);
    return {
      message: materiais.length
        ? "Materiais encontrados com sucesso."
        : "Nenhum material encontrado.",
      materiais,
    };
  }

  @ApiOperation({ summary: "Obter material por ID" })
  @ApiParam({ name: "id", required: true, description: "ID do material" })
  @ApiResponse({ status: 200, description: "Material encontrado com sucesso." })
  @ApiResponse({ status: 404, description: "Material não encontrado." })
  @Get(":id")
  async obterMaterial(@Req() req: Request, @Param("id") id: string) {
    try {
      const material = await this.materiaisService.obterPorId(id, (req.user as any).userId);
      return { message: "Material encontrado com sucesso.", material };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw new NotFoundException("Material não encontrado.");
      }
      if (error instanceof ForbiddenException) {
        throw new ForbiddenException("Você não tem permissão para acessar este material.");
      }
      throw error;
    }
  }

  @ApiOperation({ summary: "Editar material" })
  @ApiParam({ name: "id", required: true, description: "ID do material" })
  @ApiResponse({ status: 200, description: "Material atualizado com sucesso." })
  @ApiResponse({ status: 404, description: "Material não encontrado." })
  @Patch(":id")
  async editarMaterial(
    @Req() req: Request,
    @Param("id") id: string,
    @Body()
    body: {
      nomeDesignado?: string;
      topicos?: string[];
      caminhoArquivo?: string;
      assuntoId?: string;
    },
  ) {
    try {
      const material = await this.materiaisService.editar(id, (req.user as any).userId, body);
      return { message: "Material atualizado com sucesso.", material };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw new NotFoundException("Material não encontrado.");
      }
      if (error instanceof ForbiddenException) {
        throw new ForbiddenException("Você não tem permissão para editar este material.");
      }
      throw error;
    }
  }

  @ApiOperation({ summary: "Excluir material" })
  @ApiParam({ name: "id", required: true, description: "ID do material" })
  @ApiResponse({ status: 200, description: "Material excluído com sucesso." })
  @ApiResponse({ status: 404, description: "Material não encontrado." })
  @Delete(":id")
  async excluirMaterial(@Req() req: Request, @Param("id") id: string) {
    try {
      await this.materiaisService.excluir(id, (req.user as any).userId);
      return { message: "Material excluído com sucesso." };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw new NotFoundException("Material não encontrado.");
      }
      if (error instanceof ForbiddenException) {
        throw new ForbiddenException("Você não tem permissão para excluir este material.");
      }
      throw error;
    }
  }

  @ApiOperation({ 
    summary: "Upload de PDF para material",
    description: "Faz upload de um arquivo PDF, extrai o texto, gera um resumo usando IA e cria um material de estudo"
  })
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        nomeDesignado: { type: "string", example: "Introdução à Programação" },
        materiaId: { type: "string", example: "123e4567-e89b-12d3-a456-426614174000" },
        topicos: { type: "array", items: { type: "string" }, example: ["Variáveis", "Loops", "Funções"] },
        descricao: { type: "string", example: "Material sobre conceitos básicos de programação" },
      },
      required: ["nomeDesignado", "materiaId", "topicos"],
    },
  })
  @ApiResponse({ status: 201, description: "Material criado com sucesso a partir do PDF." })
  @ApiResponse({ status: 400, description: "Arquivo PDF ou campos obrigatórios ausentes." })
  @ApiResponse({ status: 413, description: "Arquivo muito grande (máximo 10MB)." })
  @ApiResponse({ status: 500, description: "Erro interno do servidor." })
  @Post("upload-pdf")
  @UseInterceptors(FileInterceptor("file", uploadPdfConfig as MulterOptions))
  async uploadPdfMaterial(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: any,
    @Req() req: Request,
  ) {
    try {
      if (!file) {
        throw new BadRequestException("Arquivo PDF é obrigatório.");
      }

      const userId = (req.user as any).userId;
      const progresso = await this.materiaisService.getProgressoMaterial(userId);
      if (!progresso || progresso.origem !== "DOCUMENTO") {
        throw new BadRequestException("Fluxo inválido: os dados do material por documento não foram informados.");
      }
      progresso.caminhoArquivo = file.path;
      progresso.nomeArquivo = file.originalname;
      progresso.descricao = body.descricao || progresso.descricao;

      const resultado = await this.materiaisService.processarPdfEgerarResumo({
        userId,
        nomeDesignado: progresso.nomeDesignado,
        materiaId: progresso.materiaId,
        topicos: progresso.topicos,
        caminhoArquivo: progresso.caminhoArquivo,
        descricao: progresso.descricao,
        nomeArquivo: progresso.nomeArquivo,
      });

      await this.materiaisService.limparProgressoMaterial(userId);

      return {
        message: "Material criado com sucesso a partir do PDF.",
        material: resultado,
        estatisticas: {
          tamanhoArquivo: file.size,
          nomeArquivo: file.originalname,
          dataUpload: new Date().toISOString(),
        }
      };

    } catch (error) {
      console.error("Erro no upload de PDF:", error);
      
      if (error instanceof BadRequestException) {
        throw error;
      }
      
      throw new BadRequestException(
        "Erro ao processar o arquivo PDF. Verifique se o arquivo é válido e tente novamente."
      );
    }
  }

      @ApiOperation({ summary: "Obter resumo automático por documento" })
  @ApiParam({ name: "id", required: true, description: "ID do material" })
  @ApiResponse({ status: 200, description: "Resumo retornado com sucesso." })
  @ApiResponse({ status: 404, description: "Resumo por documento não encontrado." })
  @Get("resumo-documento/:id")
  async getResumoPorDocumento(@Req() req: Request, @Param("id") id: string) {
    const userId = (req.user as any).userId;
    const material = await this.materiaisService.obterPorId(id, userId);
    if (!material || material.origem !== "DOCUMENTO") {
      throw new NotFoundException("Resumo por documento não encontrado.");
    }
    return {
      resumoIA: material.resumoIA,
      conteudo: material.conteudo,
      titulo: material.titulo,
      topicos: material.topicos,
      caminhoArquivo: material.caminhoArquivo,
    };
  }


  @ApiOperation({ 
    summary: "Criar resumo automático por assunto",
    description: "Cria um material de estudo com resumo gerado por IA baseado em um assunto específico"
  })
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        nomeDesignado: { type: "string", example: "Resumo de História" },
        materiaId: { type: "string", example: "123e4567-e89b-12d3-a456-426614174000" },
        topicos: { type: "array", items: { type: "string" }, example: ["Revolução Francesa", "Iluminismo"] },
        assunto: { type: "string", example: "A Revolução Francesa foi um período de grandes mudanças..." },
      },
      required: ["nomeDesignado", "materiaId", "topicos", "assunto"],
    },
  })
  @ApiResponse({ status: 201, description: "Resumo criado com sucesso." })
  @ApiResponse({ status: 400, description: "Campos obrigatórios ausentes ou inválidos." })
  @ApiResponse({ status: 500, description: "Erro interno do servidor." })
  @Post("resumo-assunto")
  async criarResumoPorAssunto(
    @Req() req: Request,
    @Body() body: any,
  ) {
    try {
      if (!body.nomeDesignado || !body.materiaId || !body.topicos?.length || !body.assunto) {
        throw new BadRequestException("Todos os campos são obrigatórios: nomeDesignado, materiaId, topicos e assunto.");
      }

      if (!Array.isArray(body.topicos) || body.topicos.length === 0) {
        throw new BadRequestException("Pelo menos um tópico deve ser fornecido.");
      }

      if (body.assunto.trim().length < 10) {
        throw new BadRequestException("O assunto deve ter pelo menos 10 caracteres para gerar um resumo adequado.");
      }

      const userId = (req.user as any).userId;
      
      const resultado = await this.materiaisService.criarMaterialComResumoAssunto({
        userId,
        nomeDesignado: body.nomeDesignado,
        materiaId: body.materiaId,
        topicos: body.topicos,
        assunto: body.assunto,
      });

      return {
        message: "Resumo por assunto criado com sucesso.",
        material: resultado,
        estatisticas: {
          assunto: body.assunto,
          quantidadeTopicos: body.topicos.length,
          dataCriacao: new Date().toISOString(),
        }
      };

    } catch (error) {
      console.error("Erro ao criar resumo por assunto:", error);
      
      if (error instanceof BadRequestException) {
        throw error;
      }
      
      throw new BadRequestException(
        "Erro ao criar resumo por assunto. Verifique os dados fornecidos e tente novamente."
      );
    }
  }

  @ApiOperation({ summary: "Obter resumo automático por assunto" })
  @ApiParam({ name: "id", required: true, description: "ID do material" })
  @ApiResponse({ status: 200, description: "Resumo retornado com sucesso." })
  @ApiResponse({ status: 404, description: "Resumo por assunto não encontrado." })
  @Get("resumo-assunto/:id")
  async getResumoPorAssunto(@Req() req: Request, @Param("id") id: string) {
    const userId = (req.user as any).userId;
    const material = await this.materiaisService.obterPorId(id, userId);
    if (!material || material.origem !== "ASSUNTO") {
      throw new NotFoundException("Resumo por assunto não encontrado.");
    }
    return {
      resumoIA: material.resumoIA,
      conteudo: material.conteudo,
      titulo: material.titulo,
      topicos: material.topicos,
      assuntoId: material.assuntoId,
    };
  }

   @ApiOperation({
    summary: "Gerar resumo IA por tópicos",
    description: "Gera um resumo automático usando IA a partir dos tópicos fornecidos. Cria e retorna o material."
  })
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        nomeDesignado: { type: "string", example: "Resumo de Programação" },
        nomeMateria: { type: "string", example: "Programação" },
        topicos: { type: "array", items: { type: "string" }, example: ["Variáveis", "Loops"] },
      },
      required: ["nomeDesignado", "nomeMateria", "topicos"],
    },
  })
  @ApiResponse({ status: 201, description: "Resumo IA gerado e material criado com sucesso." })
  @ApiResponse({ status: 400, description: "Campos obrigatórios ausentes ou inválidos." })
  @ApiResponse({ status: 500, description: "Erro interno do servidor." })
  @Post("resumo-ia-topicos")
  async gerarResumoIaPorTopicos(@Req() req: Request, @Body() body: any) {
    if (!body.nomeDesignado || !body.nomeMateria || !body.topicos?.length) {
      throw new BadRequestException("Todos os campos são obrigatórios: nomeDesignado, nomeMateria, topicos.");
    }
    if (!Array.isArray(body.topicos) || body.topicos.length === 0) {
      throw new BadRequestException("Pelo menos um tópico deve ser fornecido.");
    }

    const materia = await this.materiaisService.buscarMateriaPorNome(body.nomeMateria);
    if (!materia) {
      throw new BadRequestException("Matéria não encontrada pelo nome informado.");
    }
    const materiaId = materia.id;

    const userId = (req.user as any).userId;
    try {
      const resultado = await this.materiaisService.gerarResumoIaPorTopicos({
        userId,
        nomeDesignado: body.nomeDesignado,
        materiaId,
        topicos: body.topicos,
      });
      return {
        message: "Resumo IA gerado e material criado com sucesso.",
        material: resultado,
        estatisticas: {
          quantidadeTopicos: body.topicos.length,
          dataCriacao: new Date().toISOString(),
        }
      };
    } catch (error) {
      console.error("Erro ao gerar resumo IA por tópicos:", error);
      throw new BadRequestException("Erro ao gerar resumo IA por tópicos. Verifique os dados e tente novamente.");
    }
  }

  @ApiOperation({ summary: "Obter resumo automático por tópicos" })
  @ApiParam({ name: "id", required: true, description: "ID do material" })
  @ApiResponse({ status: 200, description: "Resumo retornado com sucesso." })
  @ApiResponse({ status: 404, description: "Resumo por tópicos não encontrado." })
  @Get("resumo-topicos/:id")
  async getResumoPorTopicos(@Req() req: Request, @Param("id") id: string) {
    const userId = (req.user as any).userId;
    const material = await this.materiaisService.obterPorId(id, userId);
    if (!material || material.origem !== "TOPICOS") {
      throw new NotFoundException("Resumo por tópicos não encontrado.");
    }
    return {
      resumoIA: material.resumoIA,
      conteudo: material.conteudo,
      titulo: material.titulo,
      topicos: material.topicos,
    };
  }

  
  @ApiOperation({ summary: "Gerar quizzes automáticos via IA" })
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        nomeDesignado: { type: "string", example: "Quiz de História" },
        materiaId: { type: "string", example: "123e4567-e89b-12d3-a456-426614174000" },
        topicos: { type: "array", items: { type: "string" }, example: ["Revolução Francesa", "Iluminismo"] },
        caminhoArquivo: { type: "string", example: "uploads/pdfs/historia.pdf" },
        tipoMaterial: { type: "string", example: "QUIZZ" },
        quantidade: { type: "number", example: 10 },
        origem: { type: "string", enum: ["TOPICOS", "DOCUMENTO", "ASSUNTO"], example: "TOPICOS" },
        textoConteudo: { type: "string", example: "Texto extraído do PDF ou digitado" },
        assunto: { type: "string", example: "A Revolução Francesa foi um período de grandes mudanças..." },
      },
      required: ["nomeDesignado", "materiaId", "quantidade", "origem"],
    },
  })
  @ApiResponse({ status: 201, description: "Quizzes gerados com sucesso.", schema: {
    type: "object",
    properties: {
      message: { type: "string" },
      material: { type: "object" },
      quizzes: { type: "array", items: { type: "object" } },
      estatisticas: {
        type: "object",
        properties: {
          quantidadeQuestoes: { type: "number" },
          dataCriacao: { type: "string", format: "date-time" },
        },
      },
    },
  }})
  @ApiResponse({ status: 400, description: "Campos obrigatórios ausentes ou inválidos." })
  @Post('quizzes')
  async gerarQuizzes(@Req() req: Request, @Body() body: any) {
    if (!body || typeof body !== 'object') {
      throw new BadRequestException('Body da requisição ausente ou inválido.');
    }
    const userId = (req.user as any).userId;
    const {
      nomeDesignado,
      materiaId,
      topicos,
      caminhoArquivo,
      tipoMaterial,
      quantidade,
      origem,
      textoConteudo,
      assunto,
    } = body;
    if (!nomeDesignado || !materiaId || !quantidade || !origem) {
      throw new BadRequestException('Campos obrigatórios ausentes: nomeDesignado, materiaId, quantidade, origem.');
    }
    const resultado = await this.materiaisService.gerarQuizzes({
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
    });
    return {
      message: 'Quizzes gerados com sucesso.',
      material: resultado.material,
      quizzes: resultado.quizzes,
      estatisticas: {
        quantidadeQuestoes: resultado.quizzes.length,
        dataCriacao: new Date().toISOString(),
      },
    };
  }

  @ApiOperation({ summary: "Gerar flashcards automáticos via IA" })
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        nomeDesignado: { type: "string", example: "Flashcards de Biologia" },
        materiaId: { type: "string", example: "123e4567-e89b-12d3-a456-426614174000" },
        topicos: { type: "array", items: { type: "string" }, example: ["Células", "Genética"] },
        caminhoArquivo: { type: "string", example: "uploads/pdfs/biologia.pdf" },
        tipoMaterial: { type: "string", example: "FLASHCARD" },
        quantidade: { type: "number", example: 10 },
        origem: { type: "string", enum: ["TOPICOS", "DOCUMENTO", "ASSUNTO"], example: "TOPICOS" },
        textoConteudo: { type: "string", example: "Texto extraído do PDF ou digitado" },
      },
      required: ["nomeDesignado", "materiaId", "quantidade", "origem"],
    },
  })
  @ApiResponse({ status: 201, description: "Flashcards gerados com sucesso.", schema: {
    type: "object",
    properties: {
      message: { type: "string" },
      material: { type: "object" },
      flashcards: { type: "array", items: { type: "object" } },
      estatisticas: {
        type: "object",
        properties: {
          quantidadeFlashcards: { type: "number" },
          dataCriacao: { type: "string", format: "date-time" },
        },
      },
    },
  }})
  @ApiResponse({ status: 400, description: "Campos obrigatórios ausentes ou inválidos." })
  @Post('flashcards')
  async gerarFlashcards(@Req() req: Request, @Body() body: any) {
    if (!body || typeof body !== 'object') {
      throw new BadRequestException('Body da requisição ausente ou inválido.');
    }
    const userId = (req.user as any).userId;
    const {
      nomeDesignado,
      materiaId,
      topicos,
      caminhoArquivo,
      tipoMaterial,
      quantidade,
      origem,
      textoConteudo,
    } = body;
    if (!nomeDesignado || !materiaId || !quantidade || !origem) {
      throw new BadRequestException('Campos obrigatórios ausentes: nomeDesignado, materiaId, quantidade, origem.');
    }
    const resultado = await this.materiaisService.gerarFlashcards({
      userId,
      nomeDesignado,
      materiaId,
      topicos,
      caminhoArquivo,
      tipoMaterial,
      quantidade,
      origem,
      textoConteudo,
    });
    return {
      message: 'Flashcards gerados com sucesso.',
      material: resultado.material,
      flashcards: resultado.flashcards,
      estatisticas: {
        quantidadeFlashcards: resultado.flashcards.length,
        dataCriacao: new Date().toISOString(),
      },
    };
 }
}
