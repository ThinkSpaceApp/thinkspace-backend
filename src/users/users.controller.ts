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
} from "@nestjs/common";
import { UsersService } from "./users.service";
import { Usuario } from "@prisma/client";
import { AuthGuard } from "@nestjs/passport";
import { Request } from "express";

@UseGuards(AuthGuard("jwt"))
@Controller("users")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post("cadastramento")
  async register(@Body() userData: Partial<Usuario>) {
    try {
      return await this.usersService.create(userData);
    } catch (error) {
      throw new BadRequestException((error as any).message);
    }
  }
  @Get("salas-estudo")
  async getSalasEstudo(@Req() req: Request) {
    const email = req.user && (req.user as any).email;
    if (!email) {
      throw new BadRequestException("Email é obrigatório");
    }
    return this.usersService.getSalasEstudoByEmail(email);
  }

  @Get("materias")
  async getMaterias(@Req() req: Request) {
    return this.usersService.getMateriasByUserId((req.user as any).userId);
  }

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

  @Post("materias/:materiaId/material/:materialId")
  async addMaterialToMateria(
    @Param("materiaId") materiaId: string,
    @Param("materialId") materialId: string,
  ) {
    return this.usersService.addMaterialToMateria(materiaId, materialId);
  }

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

  @Get("metrica/semanal")
  async getMetricaSemanal(@Req() req: Request) {
    const userId = (req.user as any)?.userId;
    if (!userId) throw new BadRequestException("Usuário não autenticado.");
    return this.usersService.getMetricaSemanal(userId);
  }

  @Get("email")
  async getEmail(@Req() req: Request) {
    const email = (req.user as any)?.email;
    return { email };
  }

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
      foto?: string;
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
    if (body.foto) updateData.foto = body.foto;
    if (body.escolaridade) updateData.escolaridade = body.escolaridade;
    if (body.funcao) updateData.funcao = body.funcao;

    const usuarioAtualizado = await this.usersService.update(userId, updateData);
    return { message: "Configurações atualizadas com sucesso.", usuario: usuarioAtualizado };
  }
}
