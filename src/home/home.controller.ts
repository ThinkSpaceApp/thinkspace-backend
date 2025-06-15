import { Controller, Get, Req, UseGuards, Post, Body, BadRequestException } from "@nestjs/common";
import { Request } from "express";
import { UsersService } from "../users/users.service";
import { AuthGuard } from "@nestjs/passport";
import { PrismaService } from "../prisma/prisma.service";

@UseGuards(AuthGuard("jwt"))
@Controller("home")
export class HomeController {
  constructor(
    private readonly usersService: UsersService,
    private readonly prisma: PrismaService,
  ) {}

  @Get("teste")
  async getBannerInfo(@Req() req: Request) {
    const userJwt = req.user as { email: string };
    if (!userJwt || !userJwt.email) {
      throw new BadRequestException("Usuário não autenticado.");
    }
    const user = await this.usersService.findByEmail(userJwt.email);
    if (!user) {
      throw new BadRequestException("Usuário não encontrado.");
    }
    const now = new Date();
    const hour = now.getHours();
    let saudacao = "Bom dia";
    if (hour >= 12 && hour < 18) {
      saudacao = "Boa tarde";
    } else if (hour >= 18 || hour < 5) {
      saudacao = "Boa noite";
    }
    return {
      mensagem: `${saudacao}, ${user.primeiroNome}`,
      relatorio: "Veja o relatório das suas metas de estudo semanais",
      relatorioUrl: `/users/${user.id}/metrica`,
    };
  }

  @Get("teste")
  async getBannerInfo() {
    return { test: "route is working" };
  }
  
  @Get("salas-estudo")
  async getSalasEstudo(@Req() req: Request) {
    const userJwt = req.user as { email: string };
    return this.usersService.getSalasEstudoByEmail(userJwt.email);
  }

  @Get("materias")
  async getMaterias(@Req() req: Request) {
    const userJwt = req.user as { userId: string };
    return this.usersService.getMateriasByUserId(userJwt.userId);
  }

  @Get("calendario")
  async getCalendario(@Req() req: Request) {
    const now = new Date();
    const meses = [
      "JAN",
      "FEV",
      "MAR",
      "ABR",
      "MAI",
      "JUN",
      "JUL",
      "AGO",
      "SET",
      "OUT",
      "NOV",
      "DEZ",
    ];
    const diasSemana = ["DOM.", "SEG.", "TER.", "QUA.", "QUI.", "SEX.", "SAB."];

    const ano = now.getFullYear();
    const mes = now.getMonth();
    const primeiroDia = new Date(ano, mes, 1);
    const ultimoDia = new Date(ano, mes + 1, 0);
    const dias = [];

    for (let dia = primeiroDia.getDate(); dia <= ultimoDia.getDate(); dia++) {
      const data = new Date(ano, mes, dia);
      const diaSemana = diasSemana[data.getDay()];
      dias.push({
        diaSemana,
        diaNumero: dia,
      });
    }

    return {
      mesAtual: meses[mes],
      anoAtual: ano,
      dias,
    };
  }

  @Post("ofensiva")
  async marcarOfensiva(
    @Req() req: Request & { user: { id: string } },
    @Body() body: { tipo: string; materialId?: string },
  ) {
    if (!req.user || !req.user.id) {
      throw new BadRequestException("Usuário não autenticado.");
    }
    const userId = req.user.id;
    const hoje = new Date();
    const dataHoje = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());

    return {
      userId,
      data: dataHoje.toISOString().split("T")[0],
      tipo: body.tipo,
      checked: true,
      message: "Atividade do dia registrada com sucesso!",
    };
  }

  @Get("ofensiva")
  async getOfensivaStatus(@Req() req: Request & { user: { id: string } }) {
    if (!req.user || !req.user.id) {
      throw new BadRequestException("Usuário não autenticado.");
    }

    return {
      userId: req.user.id,
      data: new Date().toISOString().split("T")[0],
      checked: false,
    };
  }

  @Get("notificacoes")
  async getNotificacoes(@Req() req: Request & { user: { userId: string } }) {
    const userId = req.user.userId;
    const notificacoes = await this.usersService.getNotificacoesByUserId(userId);
    if (!notificacoes || notificacoes.length === 0) {
      return {
        userId,
        notificacoes: [],
        message: "Você não possui notificações no momento.",
      };
    }
    return {
      userId,
      notificacoes,
    };
  }

  @Get("identificacao")
  async getIdentificacao(@Req() req: Request) {
    const user = await this.usersService.findByEmail((req.user as { email: string }).email);
    if (!user) {
      throw new BadRequestException("Usuário não encontrado.");
    }
    let cargo = "Usuário";
    if (user.funcao === "ADMINISTRADOR_GERAL") {
      cargo = "Administrador Geral";
    } else if (user.funcao === "ESTUDANTE") {
      cargo = "Estudante";
    }
    return {
      primeiroNome: user.primeiroNome,
      cargo,
      foto: user.foto ?? "https://ui-avatars.com/api/?name=User&background=8e44ad&color=fff",
    };
  }
}
