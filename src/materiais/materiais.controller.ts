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
import * as multer from "multer";
import { OrigemMaterial } from "@prisma/client";

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
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        origem: { type: "string", enum: ["TOPICOS", "DOCUMENTO", "ASSUNTO"] },
        nomeDesignado: { type: "string" },
        materiaId: { type: "string" },
        topicos: { type: "array", items: { type: "string" } },
        caminhoArquivo: { type: "string" },
        assuntoId: { type: "string" },
      },
      required: ["origem", "nomeDesignado", "materiaId"],
    },
  })
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
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        nomeDesignado: { type: "string" },
        topicos: { type: "array", items: { type: "string" } },
        caminhoArquivo: { type: "string" },
        assuntoId: { type: "string" },
      },
    },
  })
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

  @ApiOperation({ summary: "Upload de PDF para material" })
  @ApiResponse({ status: 201, description: "Material criado com sucesso a partir do PDF." })
  @ApiResponse({ status: 400, description: "Arquivo PDF ou campos obrigatórios ausentes." })
  @Post("upload-pdf")
  @UseInterceptors(
    FileInterceptor("file", {
      storage: multer.diskStorage({
        destination: "./uploads/pdfs",
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
          cb(null, uniqueSuffix + "-" + file.originalname);
        },
      }),
      fileFilter: (req, file, cb) => {
        if (file.mimetype !== "application/pdf") {
          return cb(new BadRequestException("Apenas arquivos PDF são permitidos."), false);
        }
        cb(null, true);
      },
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  async uploadPdfMaterial(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: { nomeDesignado: string; materiaId: string; topicos: string[] },
    @Req() req: Request,
  ) {
    if (!file) throw new BadRequestException("Arquivo PDF é obrigatório.");
    if (!body.nomeDesignado || !body.materiaId || !body.topicos?.length) {
      throw new BadRequestException("Campos obrigatórios ausentes.");
    }
    const userId = (req.user as any).userId;
    return this.materiaisService.criarMaterialComPdf({
      userId,
      nomeDesignado: body.nomeDesignado,
      materiaId: body.materiaId,
      topicos: body.topicos,
      caminhoArquivo: file.path,
    });
  }

  @ApiOperation({ summary: "Status do endpoint de upload de PDF" })
  @ApiResponse({ status: 200, description: "Endpoint de upload de PDF ativo!" })
  @Get("upload-pdf")
  getUploadPdfStatus() {
    return { status: "Endpoint de upload de PDF ativo!" };
  }

  @ApiOperation({ summary: "Criar resumo automático por assunto" })
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        nomeDesignado: { type: "string" },
        materiaId: { type: "string" },
        topicos: { type: "array", items: { type: "string" } },
        assunto: { type: "string" },
      },
      required: ["nomeDesignado", "materiaId", "topicos", "assunto"],
    },
  })
  @ApiResponse({ status: 201, description: "Resumo criado com sucesso." })
  @ApiResponse({ status: 400, description: "Campos obrigatórios ausentes." })
  @Post("resumo-assunto")
  async criarResumoPorAssunto(
    @Req() req: Request,
    @Body() body: { nomeDesignado: string; materiaId: string; topicos: string[]; assunto: string },
  ) {
    if (!body.nomeDesignado || !body.materiaId || !body.topicos?.length || !body.assunto) {
      throw new BadRequestException("Campos obrigatórios ausentes.");
    }
    const userId = (req.user as any).userId;
    return this.materiaisService.criarMaterialComResumoAssunto({
      userId,
      nomeDesignado: body.nomeDesignado,
      materiaId: body.materiaId,
      topicos: body.topicos,
      assunto: body.assunto,
    });
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
