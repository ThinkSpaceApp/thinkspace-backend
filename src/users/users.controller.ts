import {
  Controller,
  Post,
  Body,
  BadRequestException,
  Get,
  Req,
  UseGuards,
  Param,
  Patch,
  Res,
  Delete,
} from "@nestjs/common";
import { UsersService } from "./users.service";
import { Usuario } from "@prisma/client";
import { AuthGuard } from "@nestjs/passport";
import { Request, Response } from "express";
import * as bcrypt from "bcrypt";
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiBody } from "@nestjs/swagger";

@ApiTags("Usuários")
@ApiBearerAuth()
@UseGuards(AuthGuard("jwt"))
@Controller("users")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @ApiOperation({ summary: "Registrar novo usuário" })
  @ApiResponse({ status: 201, description: "Usuário registrado com sucesso." })
  @Post("cadastramento")
  async register(@Body() userData: Partial<Usuario>) {
    try {
      return await this.usersService.create(userData);
    } catch (error) {
      throw new BadRequestException((error as any).message);
    }
  }

  @ApiOperation({ summary: "Obter salas de estudo do usuário" })
  @ApiResponse({ status: 200, description: "Lista de salas de estudo." })
  @Get("salas-estudo")
  async getSalasEstudo(@Req() req: Request) {
    const email = req.user && (req.user as any).email;
    if (!email) {
      throw new BadRequestException("Email é obrigatório");
    }
    return this.usersService.getSalasEstudoByEmail(email);
  }

  @ApiOperation({ summary: "Obter matérias do usuário" })
  @ApiResponse({ status: 200, description: "Lista de matérias do usuário." })
  @Get("materias")
  async getMaterias(@Req() req: Request) {
    return this.usersService.getMateriasByUserId((req.user as any).userId);
  }

  @ApiOperation({ summary: "Criar nova matéria" })
  @ApiResponse({ status: 201, description: "Matéria criada com sucesso." })
  @Post("materias")
  async createMateria(
    @Req() req: Request,
    @Body() body: { nome: string; cor: string; icone: string },
  ) {
    if (!body.nome || !body.cor || !body.icone) {
      throw new BadRequestException("Todos os campos são obrigatórios.");
    }
    if (!req.user || !(req.user as any).userId) {
      throw new BadRequestException("Usuário não autenticado.");
    }
    return this.usersService.createMateria((req.user as any).userId, body);
  }

  @ApiOperation({ summary: "Adicionar material a uma matéria" })
  @ApiResponse({ status: 200, description: "Material adicionado à matéria com sucesso." })
  @Post("materias/:materiaId/material/:materialId")
  async addMaterialToMateria(
    @Param("materiaId") materiaId: string,
    @Param("materialId") materialId: string,
  ) {
    return this.usersService.addMaterialToMateria(materiaId, materialId);
  }

  @ApiOperation({ summary: "Atualizar tempo ativo e marcar revisão" })
  @ApiResponse({
    status: 200,
    description: "Tempo ativo atualizado e revisão marcada com sucesso.",
  })
  @Post("materias/:materiaId/tempo-ativo")
  async atualizarTempoAtivoEMarcarRevisao(
    @Param("materiaId") materiaId: string,
    @Body() body: { minutos: number },
  ) {
    if (!body.minutos) {
      throw new BadRequestException("Minutos é obrigatório.");
    }
    return this.usersService.atualizarTempoAtivoEMarcarRevisao(materiaId, body.minutos);
  }

  @ApiOperation({ summary: "Registrar atividade" })
  @ApiResponse({ status: 200, description: "Atividade registrada com sucesso." })
  @Post("metrica/registrar-atividade")
  async registrarAtividade(@Req() req: Request, @Body() body: { data?: string }) {
    const userId = (req.user as any)?.userId;
    if (!userId) throw new BadRequestException("Usuário não autenticado.");
    // Data no formato YYYY-MM-DD, default hoje
    const data = body.data ? new Date(body.data) : new Date();
    const dia = new Date(data.getFullYear(), data.getMonth(), data.getDate());

    // Cria ou incrementa atividade do dia
    await this.usersService.registrarAtividadeDiaria(userId, dia);
    return { message: "Atividade registrada com sucesso." };
  }

  @ApiOperation({ summary: "Obter métrica semanal" })
  @ApiResponse({ status: 200, description: "Métrica semanal obtida com sucesso." })
  @Get("metrica/semanal")
  async getMetricaSemanal(@Req() req: Request) {
    const userId = (req.user as any)?.userId;
    if (!userId) throw new BadRequestException("Usuário não autenticado.");
    return this.usersService.getMetricaSemanal(userId);
  }

  @ApiOperation({ summary: "Obter e-mail do usuário" })
  @ApiResponse({ status: 200, description: "E-mail do usuário retornado com sucesso." })
  @Get("email")
  async getEmail(@Req() req: Request) {
    const email = (req.user as any)?.email;
    return { email };
  }

  @ApiOperation({ summary: "Obter configurações do usuário" })
  @ApiResponse({ status: 200, description: "Configurações do usuário retornadas com sucesso." })
  @Get("configuracoes")
  async getConfiguracoes(@Req() req: Request) {
    const userId = (req.user as any)?.userId;
    if (!userId) {
      throw new BadRequestException("Usuário não autenticado.");
    }
    const usuario = await this.usersService.findById(userId);
    if (!usuario) {
      throw new BadRequestException("Usuário não encontrado.");
    }
    return { usuario };
  }

  @ApiOperation({ summary: "Atualizar configurações do usuário" })
  @ApiResponse({ status: 200, description: "Configurações atualizadas com sucesso." })
  @Patch("configuracoes")
  async atualizarConfiguracoes(
    @Req() req: Request,
    @Body()
    body: {
      primeiroNome?: string;
      sobrenome?: string;
      dataNascimento?: string;
      instituicaoId?: string;
      nomeCompleto?: string;
      escolaridade?: string;
      funcao?: string;
    },
  ) {
    const userId = (req.user as any)?.userId;
    if (!userId) {
      throw new BadRequestException("Usuário não autenticado.");
    }

    const updateData: any = {};
    if (body.primeiroNome) updateData.primeiroNome = body.primeiroNome;
    if (body.sobrenome) updateData.sobrenome = body.sobrenome;
    if (body.dataNascimento) updateData.dataNascimento = new Date(body.dataNascimento);
    if (body.instituicaoId) updateData.instituicaoId = body.instituicaoId;
    if (body.nomeCompleto) updateData.nomeCompleto = body.nomeCompleto;
    if (body.escolaridade) updateData.escolaridade = body.escolaridade;
    if (body.funcao) updateData.funcao = body.funcao;

    const usuarioAtualizado = await this.usersService.update(userId, updateData);
    return { message: "Configurações atualizadas com sucesso.", usuario: usuarioAtualizado };
  }

  @ApiOperation({ summary: "Editar e-mail do usuário" })
  @ApiResponse({ status: 200, description: "E-mail atualizado com sucesso." })
  @Patch("editar-email")
  async editarEmail(@Req() req: Request, @Body() body: { novoEmail: string }) {
    const userId = (req.user as any)?.userId;
    if (!userId) {
      throw new BadRequestException("Usuário não autenticado.");
    }
    if (!body.novoEmail) {
      throw new BadRequestException("Novo e-mail é obrigatório.");
    }
    const existente = await this.usersService.findByEmail(body.novoEmail);
    if (existente) {
      throw new BadRequestException("E-mail já está em uso.");
    }
    const usuarioAtualizado = await this.usersService.update(userId, { email: body.novoEmail });
    return { message: "E-mail atualizado com sucesso.", usuario: usuarioAtualizado };
  }

  @ApiOperation({ summary: "Editar senha do usuário" })
  @ApiResponse({ status: 200, description: "Senha atualizada com sucesso." })
  @Patch("editar-senha")
  async editarSenha(@Req() req: Request, @Body() body: { novaSenha: string }) {
    const userId = (req.user as any)?.userId;
    if (!userId) {
      throw new BadRequestException("Usuário não autenticado.");
    }
    if (!body.novaSenha) {
      throw new BadRequestException("Todos os campos são obrigatórios.");
    }
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new BadRequestException("Usuário não encontrado.");
    }
    const passwordErrors: string[] = [];
    if (body.novaSenha.length < 8) {
      passwordErrors.push("A senha deve ter pelo menos 8 caracteres");
    }
    if (!/[A-Z]/.test(body.novaSenha)) {
      passwordErrors.push("A senha deve conter pelo menos uma letra maiúscula");
    }
    if (!/[a-z]/.test(body.novaSenha)) {
      passwordErrors.push("A senha deve conter pelo menos uma letra minúscula");
    }
    if (!/\d/.test(body.novaSenha)) {
      passwordErrors.push("A senha deve conter pelo menos um número");
    }
    if (!/[@$!%*?&]/.test(body.novaSenha)) {
      passwordErrors.push("A senha deve conter pelo menos um caractere especial (@$!%*?&)");
    }
    if (passwordErrors.length > 0) {
      throw new BadRequestException(
        `A nova senha não atende aos requisitos: ${passwordErrors.join(", ")}.`,
      );
    }
    const novaSenhaHash = await bcrypt.hash(body.novaSenha, 10);
    const usuarioAtualizado = await this.usersService.update(userId, { senha: novaSenhaHash });
    return { message: "Senha atualizada com sucesso.", usuario: usuarioAtualizado };
  }

  @ApiOperation({ summary: "Obter nome da instituição do usuário" })
  @ApiResponse({ status: 200, description: "Nome da instituição retornado com sucesso." })
  @Get("instituicao/nome")
  async getInstituicaoNome(@Req() req: Request) {
    const userId = (req.user as any)?.userId;
    if (!userId) {
      throw new BadRequestException("Usuário não autenticado.");
    }
    const usuario = await this.usersService.findById(userId);
    if (!usuario || !usuario.instituicaoId) {
      throw new BadRequestException("Instituição não encontrada para o usuário.");
    }
    const instituicao = await this.usersService.getInstituicaoById(usuario.instituicaoId);
    if (!instituicao) {
      throw new BadRequestException("Instituição não encontrada.");
    }
    return { nome: instituicao.nome };
  }

  @ApiOperation({ summary: "Excluir conta do usuário" })
  @ApiResponse({ status: 200, description: "Conta excluída com sucesso." })
  @Delete("deletar-usuario")
  async deleteAccount(@Req() req: Request, @Res() res: Response) {
    try {
      const userId = (req.user as any)?.userId;

      if (!userId) {
        return res.status(401).json({ message: "Usuário não autenticado." });
      }

      const deletedUser = await this.usersService.deleteById(userId);

      if (!deletedUser) {
        return res.status(404).json({ message: "Usuário não encontrado." });
      }

      return res.status(200).json({ message: "Conta excluída com sucesso." });
    } catch (error) {
      return res.status(500).json({ message: "Erro ao excluir conta.", error });
    }
  }
}
