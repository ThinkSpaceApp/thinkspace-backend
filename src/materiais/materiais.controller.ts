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
} from "@nestjs/common";
import { Request } from "express";
import { AuthGuard } from "@nestjs/passport";
import { MateriaisService } from "./materiais.service";

@UseGuards(AuthGuard("jwt"))
@Controller("materiais")
export class MateriaisController {
  constructor(private readonly materiaisService: MateriaisService) {}

  @Get("/")
  getStatus() {
    return { status: "Servidor de materiais ativo!" };
  }

  //   @Get()
  //   async listarMateriais(@Req() req: Request) {
  //     return this.materiaisService.listarPorUsuario((req.user as any).userId);
  //   }

  //   @Get(":id")
  //   async obterMaterial(@Req() req: Request, @Param("id") id: string) {
  //     return this.materiaisService.obterPorId(id, (req.user as any).userId);
  //   }

  //   @Post()
  //   async criarMaterial(
  //     @Req() req: Request,
  //     @Body() body: { nome: string; descricao?: string; url?: string }
  //   ) {
  //     if (!body.nome) throw new BadRequestException("Nome é obrigatório.");
  //     return this.materiaisService.criar((req.user as any).userId, body);
  //   }

  //   @Patch(":id")
  //   async editarMaterial(
  //     @Req() req: Request,
  //     @Param("id") id: string,
  //     @Body() body: { nome?: string; descricao?: string; url?: string }
  //   ) {
  //     return this.materiaisService.editar(id, (req.user as any).userId, body);
  //   }

  //   @Delete(":id")
  //   async excluirMaterial(@Req() req: Request, @Param("id") id: string) {
  //     return this.materiaisService.excluir(id, (req.user as any).userId);
  //     return { message: "Material excluído (placeholder)" };
  //   }
}
