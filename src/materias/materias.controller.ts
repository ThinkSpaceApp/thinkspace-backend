import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Req,
  UseGuards,
  BadRequestException,
  Patch,
  Delete,
  Headers,
} from "@nestjs/common";
import { Request } from "express";
import { UsersService } from "../users/users.service";
import { AuthGuard } from "@nestjs/passport";

@UseGuards(AuthGuard("jwt"))
@Controller("materias")
export class MateriasController {
  constructor(private readonly usersService: UsersService) {}

  @Get("perfil")
  async getPerfilUsuario(@Req() req: Request) {
    if (!req.user || !(req.user as any).email) {
      throw new BadRequestException("Usuário não autenticado.");
    }
    const user = await this.usersService.findByEmail((req.user as any).email);
    if (!user || !user.experiencia) {
      throw new BadRequestException("Perfil do usuário não encontrado.");
    }
    let cargo = "Usuário";
    if (user.funcao === "ADMINISTRADOR_GERAL") {
      cargo = "Administrador Geral";
    } else if (user.funcao === "ESTUDANTE") {
      cargo = "Estudante";
    }
    return {
      avatar: user.experiencia.avatar,
      primeiroNome: user.primeiroNome,
      cargo,
      xp: user.experiencia.xp,
      progresso: user.experiencia.progresso,
      nivel: user.experiencia.nivel,
    };
  }

  @Get()
  async getMaterias(@Req() req: Request) {
    return this.usersService.getMateriasByUserId((req.user as any).userId);
  }

  @Get(":id")
  async getMateriaById(@Req() req: Request, @Param("id") id: string) {
    const materias = await this.usersService.getMateriasByUserId((req.user as any).userId);
    const materia = materias.find((m: any) => m.id === id);
    if (!materia) {
      throw new BadRequestException("Matéria não encontrada.");
    }
    return materia;
  }

  @Post()
  async criarMateria(
    @Req() req: Request,
    @Body() body: { nome: string; cor: string; icone: string },
  ) {
    if (!body.nome || !body.cor || !body.icone) {
      throw new BadRequestException("Nome, cor e ícone são obrigatórios.");
    }
    const userId = (req.user as any).userId;
    const materia = await this.usersService.createMateria(userId, body);
    return { message: "Matéria criada com sucesso.", materia };
  }

  @Patch(":id")
  async editarMateria(
    @Req() req: Request,
    @Param("id") id: string,
    @Body() body: { nome?: string; cor?: string; icone?: string },
  ) {
    const user = await this.usersService.findByEmail((req.user as any).email);
    if (!user) {
      throw new BadRequestException("Usuário não encontrado.");
    }
    const materia = await this.usersService.getMateriaById(id);
    if (!materia || materia.usuarioId !== user.id) {
      throw new BadRequestException("Matéria não encontrada ou não pertence ao usuário.");
    }

    if (body.cor) {
      const allowedColors = ["SALMAO", "ROSA", "LILAS", "ROXO"];
      if (!allowedColors.includes(body.cor)) {
        throw new BadRequestException("Cor inválida.");
      }
    }
    const materiaEditada = await this.usersService.editarMateria(id, body);
    return { message: "Matéria editada com sucesso.", materia: materiaEditada };
  }

  @Delete(":id")
  async excluirMateria(@Req() req: Request, @Param("id") id: string) {
    if (!req.user || !(req.user as any).email) {
      throw new BadRequestException("Usuário não autenticado.");
    }
    const user = await this.usersService.findByEmail((req.user as any).email);
    if (!user) {
      throw new BadRequestException("Usuário não encontrado.");
    }
    const materia = await this.usersService.getMateriaById(id);
    if (!materia || materia.usuarioId !== user.id) {
      throw new BadRequestException("Matéria não encontrada ou não pertence ao usuário.");
    }
    await this.usersService.excluirMateria(id);
    return { message: "Matéria excluída com sucesso." };
  }

  @Get("cumprimento")
  async cumprimentoUsuario(@Req() req: Request) {
    const user = await this.usersService.findByEmail((req.user as any).email);
    if (!user) {
      throw new BadRequestException("Usuário não encontrado.");
    }
    return {
      cumprimento: `Olá, ${user.primeiroNome}`,
    };
  }

  @Get("recentes")
  async getMateriasRecentes(@Req() req: Request) {
    let userId = (req.user as any)?.userId;
    if (!userId && (req.user as any)?.email) {
      const user = await this.usersService.findByEmail((req.user as any).email);
      userId = user?.id;
    }
    if (!userId) {
      throw new BadRequestException("Usuário não autenticado.");
    }

    const materias = await this.usersService.getMateriasByUserIdOrdenadasPorUltimaRevisao(userId);

    if (!materias || materias.length === 0) {
      return { message: "O usuário não possui nehuma matéria recente" };
    }

    const materiasRecentes = materias.slice(0, 5).map((materia, idx) => ({
      indice: idx + 1,
      nome: materia.nome,
      // ...adicione outros campos se necessário...
    }));

    return { materiasRecentes };
  }
}
