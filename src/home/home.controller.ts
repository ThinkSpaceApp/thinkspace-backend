import { Controller, Get, Req, BadRequestException, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { UsersService } from '../users/users.service';
import { AuthGuard } from '@nestjs/passport';

@UseGuards(AuthGuard('jwt'))
@Controller('home')
export class HomeController {
  constructor(private readonly usersService: UsersService) {}

  @Get('banner')
  async getBannerInfo(@Req() req: Request) {
    const userJwt = req.user as { email: string };
    if (!userJwt || !userJwt.email) {
      throw new BadRequestException('Usuário não autenticado.');
    }
    const user = await this.usersService.findByEmail(userJwt.email);
    if (!user) {
      throw new BadRequestException('Usuário não encontrado.');
    }
    const now = new Date();
    const hour = now.getHours();
    let saudacao = 'Bom dia';
    if (hour >= 12 && hour < 18) {
      saudacao = 'Boa tarde';
    } else if (hour >= 18 || hour < 5) {
      saudacao = 'Boa noite';
    }
    return {
      mensagem: `${saudacao}, ${user.primeiroNome}`,
      relatorio: 'Veja o relatório das suas metas de estudo semanais',
      relatorioUrl: `/users/${user.id}/metrica`
    };
  }
  @Get('salas-estudo')
  async getSalasEstudo(@Req() req: Request) {
    const userJwt = req.user as { email: string };
    return this.usersService.getSalasEstudoByEmail(userJwt.email);
  }

  @Get('materias')
  async getMaterias(@Req() req: Request) {
    const userJwt = req.user as { userId: string };
    return this.usersService.getMateriasByUserId(userJwt.userId);
  }

  @Get('calendario')
  async getCalendario(@Req() req: Request) {
    const now = new Date();
    const meses = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
    const diasSemana = ['DOM.', 'SEG.', 'TER.', 'QUA.', 'QUI.', 'SEX.', 'SAB.'];

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
}
