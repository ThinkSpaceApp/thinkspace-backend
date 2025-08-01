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
// import { UploadPdfDto } from "./dto/upload-pdf.dto";
// import { ResumoAssuntoDto } from "./dto/resumo-assunto.dto";
import { uploadPdfConfig } from "./config/upload.config";

@ApiTags("Materiais")
@ApiBearerAuth()
@UseGuards(AuthGuard("jwt"))
@Controller("materiais")
export class MateriaisController {
  constructor(private readonly materiaisService: MateriaisService) {}

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

  @ApiOperation({ summary: "Criar material" })
  @ApiResponse({ status: 201, description: "Material criado com sucesso." })
  @ApiResponse({ status: 400, description: "Campos obrigatórios ausentes ou inválidos." })
  @Post()
  async criarMaterial(
    @Req() req: Request,
    @Body()
    body: {
      origem: OrigemMaterial;
      nomeDesignado: string;
      materiaId: string;
      topicos?: string[];
      caminhoArquivo?: string;
      assuntoId?: string;
    },
  ) {
    const userId = (req.user as any).userId;
    if (!body.origem) throw new BadRequestException("Origem do material é obrigatória.");
    if (!body.nomeDesignado) throw new BadRequestException("Nome designado é obrigatório.");
    if (!body.materiaId) throw new BadRequestException("Matéria é obrigatória.");

    if (body.origem === "TOPICOS") {
      if (!body.topicos || !body.topicos.length) {
        throw new BadRequestException("Tópicos são obrigatórios para criação por tópicos.");
      }
      const material = await this.materiaisService.criarPorTopicos(userId, {
        nomeDesignado: body.nomeDesignado,
        materiaId: body.materiaId,
        topicos: body.topicos,
      });
      return { message: "Material criado por tópicos com sucesso.", material };
    }

    if (body.origem === "DOCUMENTO") {
      if (!body.topicos || !body.topicos.length) {
        throw new BadRequestException("Tópicos são obrigatórios para criação por documento.");
      }
      if (!body.caminhoArquivo) {
        throw new BadRequestException("Arquivo PDF é obrigatório para criação por documento.");
      }
      const material = await this.materiaisService.criarPorDocumento(userId, {
        nomeDesignado: body.nomeDesignado,
        materiaId: body.materiaId,
        topicos: body.topicos,
        caminhoArquivo: body.caminhoArquivo,
      });
      return { message: "Material criado por documento com sucesso.", material };
    }

    if (body.origem === "ASSUNTO") {
      if (!body.topicos || !body.topicos.length) {
        throw new BadRequestException("Tópicos são obrigatórios para criação por assunto.");
      }
      if (!body.assuntoId) {
        throw new BadRequestException("Assunto principal é obrigatório para criação por assunto.");
      }
      const material = await this.materiaisService.criarPorAssunto(userId, {
        nomeDesignado: body.nomeDesignado,
        materiaId: body.materiaId,
        topicos: body.topicos,
        assuntoId: body.assuntoId,
      });
      return { message: "Material criado por assunto com sucesso.", material };
    }

    throw new BadRequestException("Origem do material inválida.");
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

      if (!body.nomeDesignado || !body.materiaId || !body.topicos?.length) {
        throw new BadRequestException("Nome designado, matéria ID e tópicos são obrigatórios.");
      }

      if (!Array.isArray(body.topicos) || body.topicos.length === 0) {
        throw new BadRequestException("Pelo menos um tópico deve ser fornecido.");
      }

      const userId = (req.user as any).userId;
      
      const resultado = await this.materiaisService.processarPdfEgerarResumo({
        userId,
        nomeDesignado: body.nomeDesignado,
        materiaId: body.materiaId,
        topicos: body.topicos,
        caminhoArquivo: file.path,
        descricao: body.descricao,
        nomeArquivo: file.originalname,
      });

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

  @ApiOperation({ summary: "Status do endpoint de upload de PDF" })
  @ApiResponse({ status: 200, description: "Endpoint de upload de PDF ativo!" })
  @Get("upload-pdf")
  getUploadPdfStatus() {
    return { status: "Endpoint de upload de PDF ativo!" };
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
}
