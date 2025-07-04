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
  NotFoundException,
} from "@nestjs/common";
import { Request } from "express";
import { UsersService } from "../users/users.service";
import { AuthGuard } from "@nestjs/passport";
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
} from "@nestjs/swagger";

@ApiTags("Matérias")
@ApiBearerAuth()
@UseGuards(AuthGuard("jwt"))
@Controller("materias")
export class MateriasController {
  constructor(private readonly usersService: UsersService) {}

  @ApiOperation({ summary: "Obter perfil do usuário para matérias" })
  @ApiResponse({ status: 200, description: "Perfil retornado com sucesso." })
  @ApiResponse({ status: 400, description: "Usuário não autenticado ou perfil não encontrado." })
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

  @ApiOperation({ summary: "Listar matérias do usuário" })
  @ApiResponse({ status: 200, description: "Lista de matérias retornada com sucesso." })
  @Get()
  async getMaterias(@Req() req: Request) {
    return this.usersService.getMateriasByUserId((req.user as any).userId);
  }

  @ApiOperation({ summary: "Criar nova matéria" })
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        nome: { type: "string" },
        cor: { type: "string" },
        icone: { type: "string" },
      },
      required: ["nome", "cor", "icone"],
    },
  })
  @ApiResponse({ status: 201, description: "Matéria criada com sucesso." })
  @ApiResponse({ status: 400, description: "Nome, cor e ícone são obrigatórios." })
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

  @ApiOperation({ summary: "Editar matéria" })
  @ApiParam({ name: "id", required: true, description: "ID da matéria" })
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        nome: { type: "string" },
        cor: { type: "string" },
        icone: { type: "string" },
      },
    },
  })
  @ApiResponse({ status: 200, description: "Matéria editada com sucesso." })
  @ApiResponse({ status: 400, description: "Matéria não encontrada ou não pertence ao usuário." })
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

  @ApiOperation({ summary: "Excluir matéria" })
  @ApiParam({ name: "id", required: true, description: "ID da matéria" })
  @ApiResponse({ status: 200, description: "Matéria excluída com sucesso." })
  @ApiResponse({ status: 400, description: "Matéria não encontrada ou não pertence ao usuário." })
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

  @ApiOperation({ summary: "Cumprimento do usuário" })
  @ApiResponse({ status: 200, description: "Cumprimento retornado com sucesso." })
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

  @ApiOperation({
    summary: "Listar matérias recentes do usuário (até 5, ordem dinâmica pela última entrada)",
  })
  @ApiResponse({ status: 200, description: "Matérias recentes retornadas com sucesso." })
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

    const materiasOrdenadas = [...materias].sort((a, b) => {
      const dataA = a.ultimaRevisao ? new Date(a.ultimaRevisao).getTime() : 0;
      const dataB = b.ultimaRevisao ? new Date(b.ultimaRevisao).getTime() : 0;
      return dataB - dataA;
    });

    if (!materiasOrdenadas || materiasOrdenadas.length === 0) {
      return { message: "O usuário não possui nehuma matéria recente" };
    }

    const materiasRecentes = materiasOrdenadas.slice(0, 5).map((materia, idx) => ({
      indice: idx + 1,
      nome: materia.nome,
      id: materia.id,
      cor: materia.cor,
      icone: materia.icone,
      ultimaRevisao: materia.ultimaRevisao,
      tempoAtivo: materia.tempoAtivo,
    }));

    return { materiasRecentes };
  }

  @ApiOperation({ summary: "Obter matéria por ID" })
  @ApiParam({ name: "id", required: true, description: "ID da matéria" })
  @ApiResponse({ status: 200, description: "Matéria retornada com sucesso." })
  @ApiResponse({ status: 400, description: "Matéria não encontrada." })
  @Get(":id")
  async getMateriaById(@Req() req: Request, @Param("id") id: string) {
    const materia = await this.usersService.getMateriaById(id);
    if (!materia) {
      throw new BadRequestException("Matéria não encontrada.");
    }
    if (materia.usuarioId !== (req.user as any).userId) {
      throw new BadRequestException("Matéria não encontrada ou não pertence ao usuário.");
    }
    await this.usersService.atualizarUltimaEntradaMateria(id);
    const materiaAtualizada = await this.usersService.getMateriaById(id);
    return materiaAtualizada;
  }
}
