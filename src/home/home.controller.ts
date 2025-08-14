import { Controller, Get, Req, UseGuards, Post, Body, BadRequestException } from "@nestjs/common";
import { Request } from "express";
import { UsersService } from "../users/users.service";
import { AuthGuard } from "@nestjs/passport";
import { PrismaService } from "../prisma/prisma.service";
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { salaEstudoService } from "../salaEstudo/salaEstudo.service";

@ApiTags("Home")
@ApiBearerAuth()
@UseGuards(AuthGuard("jwt"))
@Controller("home")

export class HomeController {
  @ApiOperation({ summary: "Verificar status da ofensiva semanal do usuário" })
  @ApiResponse({ status: 200, description: "Status semanal retornado com sucesso." })
  @Get("ofensiva")
  async getOfensivaSemanal(@Req() req: Request & { user: { id?: string; userId?: string } }) {
    const userId = req.user?.id || req.user?.userId;
    if (!userId) {
      throw new BadRequestException("Usuário não autenticado.");
    }
    const hoje = new Date();
    const diaHoje = hoje.getDay(); 
    const metrica = await this.usersService.getMetricaSemanal(userId);
    // status: 0 = dia atual/futuros, 1 = anteriores não feitos, 2 = anteriores feitos
    const statusDias = metrica.diasSemana.map((dia, idx) => {
      if (idx > diaHoje) return 0;
      if (idx === diaHoje) return dia.feito ? 2 : 0; // dia atual: 2 se feito, 0 se não feito
      return dia.feito ? 2 : 1; 
    });
    return {
      dias: metrica.diasSemana.map(d => d.data),
      status: statusDias,
      message: "Status semanal da ofensiva calculado com sucesso.",
    };
  }
  constructor(
    private readonly usersService: UsersService,
    private readonly prisma: PrismaService,
    private readonly salaEstudoService: salaEstudoService,
  ) {}

  @ApiOperation({ summary: "Obter informações do banner de saudação" })
  @ApiResponse({ status: 200, description: "Banner retornado com sucesso." })
  @Get("banner")
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
      mensagem: `${saudacao}, ${user.primeiroNome}!`,
      relatorio: "Veja o relatório das suas metas de estudo semanais",
      relatorioUrl: `/users/${user.id}/metrica`,
    };
  }

  @ApiOperation({ summary: "Obter salas de estudo do usuário" })
  @ApiResponse({ status: 200, description: "Salas de estudo retornadas com sucesso." })
  @Get("salas-estudo")
  async getSalasEstudo(@Req() req: Request) {
    await this.salaEstudoService.ensureDefaultRoom();
    await this.salaEstudoService.ensureAllUsersInDefaultRoom();
    const userJwt = req.user as { email: string };
    return this.usersService.getSalasEstudoByEmail(userJwt.email);
  }

  @ApiOperation({ summary: "Obter matérias do usuário" })
  @ApiResponse({ status: 200, description: "Matérias retornadas com sucesso." })
  @Get("materias")
  async getMaterias(@Req() req: Request) {
    const userJwt = req.user as { userId: string };
    const materias = await this.usersService.getMateriasByUserId(userJwt.userId);
    materias.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' }));
    return materias;
  }

  @ApiOperation({ summary: "Obter calendário do mês atual" })
  @ApiResponse({ status: 200, description: "Calendário retornado com sucesso." })
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
    const diaAtual = now.getDate();
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
      diaAtual,
    };
  }

  @ApiOperation({ summary: "Obter notificações do usuário" })
  @ApiResponse({ status: 200, description: "Notificações retornadas com sucesso." })
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

  @ApiOperation({ summary: "Obter identificação do usuário" })
  @ApiResponse({ status: 200, description: "Identificação retornada com sucesso." })
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

    const initials = (user.primeiroNome?.charAt(0) ?? "") + (user.sobrenome?.charAt(0) ?? "");
    return {
      primeiroNome: user.primeiroNome,
      cargo,
      foto: `https://ui-avatars.com/api/?name=${initials}&background=8e44ad&color=fff`,
    };
  }
}
