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
    const metrica = await this.usersService.getMetricaSemanal(userId);
    let maiorOfensiva = 0;
    let ofensivaAtual = 0;
    let estudouAlgumDia = false;
    for (let i = 0; i < metrica.diasSemana.length; i++) {
      if (metrica.diasSemana[i].status === 2) {
        ofensivaAtual++;
        estudouAlgumDia = true;
        if (ofensivaAtual > maiorOfensiva) maiorOfensiva = ofensivaAtual;
      } else {
        ofensivaAtual = 0;
      }
    }
    let mensagemOfensiva = "";
    if (!estudouAlgumDia) {
      mensagemOfensiva = "Comece a estudar para iniciar sua ofensiva!";
    } else if (maiorOfensiva > 0) {
      mensagemOfensiva = `Sua ofensiva atual é de ${maiorOfensiva} dia${maiorOfensiva === 1 ? '' : 's'} consecutivo${maiorOfensiva === 1 ? '' : 's'}`;
    } else {
      mensagemOfensiva = "Você perdeu a ofensiva. Volte a estudar para iniciar uma nova sequência!";
    }
    return {
      dias: metrica.diasSemana.map((d) => d.data),
      status: metrica.diasSemana.map((d) => d.status),
      message: "Status semanal da ofensiva calculado com sucesso.",
      mensagemOfensiva,
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
      const salas = await this.usersService.getSalasEstudoByEmail(userJwt.email);
      const palette = ["#7C3AED", "#a18ddfff", "#ee82a2ff", "#8e44ad"];
      let salasComCor;
      if (Array.isArray(salas)) {
        salasComCor = salas.map((sala: any, idx: number) => ({
          ...sala,
          cor: palette[idx % palette.length],
        }));
      } else if (salas && Array.isArray(salas.salasMembro)) {
        salasComCor = {
          ...salas,
          salasMembro: salas.salasMembro.map((sala: any, idx: number) => ({
            ...sala,
            cor: palette[idx % palette.length],
          })),
        };
      } else {
        salasComCor = salas;
      }

    const ultimosUsuarios = await this.prisma.usuario.findMany({
      where: { funcao: "ESTUDANTE" },
      orderBy: { ultimoLogin: "desc" },
      take: 4,
      select: {
        primeiroNome: true,
        sobrenome: true,
        foto: true,
        id: true,
        nomeCompleto: true,
        email: true,
      },
    });
    const paletteBg = ["7C3AED", "A78BFA", "ee8bc3ff", "8e44ad"];
    const avatares = ultimosUsuarios.map((u, idx) => {
      if (u.foto && !u.foto.includes("ui-avatars.com/api/?name=User")) {
        return u.foto;
      }
      let iniciais = "";
      const nome = u.primeiroNome?.trim() || "";
      const sobrenome = u.sobrenome?.trim() || "";
      if (nome || sobrenome) {
        iniciais = `${nome.charAt(0)}${sobrenome.charAt(0)}`.toUpperCase();
      } else if (u.nomeCompleto) {
        const partes = u.nomeCompleto.trim().split(" ");
        iniciais =
          partes.length > 1
            ? `${partes[0][0]}${partes[1][0]}`.toUpperCase()
            : `${partes[0][0]}`.toUpperCase();
      } else if (u.email) {
        iniciais = u.email.charAt(0).toUpperCase();
      } else {
        iniciais = "U";
      }
      const corBg = paletteBg[idx % paletteBg.length];
      return `https://ui-avatars.com/api/?name=${encodeURIComponent(iniciais)}&background=${corBg}&color=fff`;
    });

    const totalEstudantes = await this.prisma.usuario.count({ where: { funcao: "ESTUDANTE" } });

    return {
      ...(Array.isArray(salasComCor) ? { salas: salasComCor } : salasComCor),
      avataresUltimosUsuarios: avatares,
      totalEstudantes,
    };
  }

  @ApiOperation({ summary: "Obter matérias do usuário" })
  @ApiResponse({ status: 200, description: "Matérias retornadas com sucesso." })
  @Get("materias")
  async getMaterias(@Req() req: Request) {
    const userJwt = req.user as { userId: string };
    const materias = await this.usersService.getMateriasByUserIdOrdenadasPorUltimaRevisao(userJwt.userId);
    const materiasComXp = await Promise.all(
      materias.map(async (materia) => {
        const materiais = await this.prisma.materialEstudo.findMany({ where: { materiaId: materia.id } });
        let xpAcumulada = 0;
        for (const material of materiais) {
          let quizzes = [];
          let respostas: Record<string, any> = {};
          try {
            quizzes = material.quizzesJson ? JSON.parse(material.quizzesJson) : [];
          } catch {}
          try {
            respostas = material.respostasQuizJson ? JSON.parse(material.respostasQuizJson) : {};
          } catch {}
          quizzes.forEach((quiz: { correta: any }, idx: number) => {
            const respostaUsuario = respostas[idx] || respostas[String(idx)];
            if (respostaUsuario) {
              if (respostaUsuario === quiz.correta) {
                xpAcumulada += 5;
              } else {
                xpAcumulada -= 2;
              }
            }
          });
        }
        if (xpAcumulada < 0) xpAcumulada = 0;
        const barraProgresso = Math.min(100, Math.round((xpAcumulada / 1000) * 100));
        return {
          ...materia,
          xpAcumulada,
          barraProgresso,
        };
      })
    );
    materiasComXp.sort((a, b) => {
      const aData = a.ultimaRevisao ? new Date(a.ultimaRevisao).getTime() : 0;
      const bData = b.ultimaRevisao ? new Date(b.ultimaRevisao).getTime() : 0;
      return bData - aData;
    });
    return materiasComXp;
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
