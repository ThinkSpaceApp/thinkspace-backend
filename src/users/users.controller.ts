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

  @ApiOperation({ summary: "Teste de autenticação e dados do usuário" })
  @ApiResponse({ status: 200, description: "Dados do usuário autenticado." })
  @Get("test-auth")
  async testAuth(@Req() req: Request) {
    try {
      const user = req.user as any;
      if (!user) {
        throw new BadRequestException("Usuário não autenticado");
      }

      return {
        message: "Autenticação funcionando",
        user: {
          userId: user.userId,
          email: user.email,
        },
        headers: req.headers,
        cookies: req.cookies,
      };
    } catch (error) {
      console.error("Erro no teste de autenticação:", error);
      throw new BadRequestException("Erro no teste de autenticação");
    }
  }

  @ApiOperation({ summary: "Obter salas de estudo do usuário" })
  @ApiResponse({ status: 200, description: "Lista de salas de estudo." })
  @Get("salas-estudo")
  async getSalasEstudo(@Req() req: Request) {
    try {
      const user = req.user as any;
      if (!user || !user.email) {
        throw new BadRequestException("Usuário não autenticado ou email não encontrado");
      }

      return this.usersService.getSalasEstudoByEmail(user.email);
    } catch (error) {
      console.error("Erro no endpoint getSalasEstudo:", error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException("Erro interno ao buscar salas de estudo");
    }
  }

  @ApiOperation({ summary: "Obter matérias do usuário" })
  @ApiResponse({ status: 200, description: "Lista de matérias do usuário." })
  @Get("materias")
  async getMaterias(@Req() req: Request) {
    return this.usersService.getMateriasByUserId((req.user as any).userId);
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

  @ApiOperation({ summary: "Teste de consulta do banco de dados" })
  @ApiResponse({ status: 200, description: "Teste de consulta." })
  @Get("test-db")
  async testDb(@Req() req: Request) {
    try {
      const email = req.query.email as string;
      const result = await this.usersService.testDatabase(email);

      return {
        message: "Teste de banco de dados",
        ...result,
      };
    } catch (error) {
      console.error("Erro no teste de banco de dados:", error);
      const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
      throw new BadRequestException(`Erro no teste de banco de dados: ${errorMessage}`);
    }
  }

  @ApiOperation({ summary: "Teste da sala padrão" })
  @ApiResponse({ status: 200, description: "Teste da sala padrão." })
  @Get("test-default-room")
  async testDefaultRoom() {
    try {
      const result = await this.usersService.testDefaultRoom();
      return result;
    } catch (error) {
      console.error("Erro no teste da sala padrão:", error);
      const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
      throw new BadRequestException(`Erro no teste da sala padrão: ${errorMessage}`);
    }
  }
}
