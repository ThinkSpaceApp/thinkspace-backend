import { Controller, Patch, Body, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';
import { ConfiguracoesService } from './configuracoes.service';

@ApiTags('Configurações')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('configuracoes')
export class ConfiguracoesController {
  constructor(private readonly configuracoesService: ConfiguracoesService) {}
  @Patch('primeiro-nome')
  async alterarPrimeiroNome(@Req() req: Request, @Body('primeiroNome') primeiroNome: string) {
    if (!req.user || !('userId' in req.user)) {
      throw new Error('Usuário não autenticado ou userId ausente.');
    }
    return this.configuracoesService.alterarPrimeiroNome((req.user as any).userId, primeiroNome);
  }
  @Patch('sobrenome')
  async alterarSobrenome(@Req() req: Request, @Body('sobrenome') sobrenome: string) {
    if (!req.user || !('userId' in req.user)) {
      throw new Error('Usuário não autenticado ou userId ausente.');
    }
    return this.configuracoesService.alterarSobrenome((req.user as any).userId, sobrenome);
  }
  @Patch('data-nascimento')
  async alterarDataNascimento(@Req() req: Request, @Body('dataNascimento') dataNascimento: string) {
    if (!req.user || !('userId' in req.user)) {
      throw new Error('Usuário não autenticado ou userId ausente.');
    }
    return this.configuracoesService.alterarDataNascimento((req.user as any).userId, dataNascimento);
  }

  @Patch('instituicao')
  async alterarInstituicao(@Req() req: Request, @Body('instituicao') instituicao: string) {
    if (!req.user || !('userId' in req.user)) {
      throw new Error('Usuário não autenticado ou userId ausente.');
    }
    return this.configuracoesService.alterarInstituicao((req.user as any).userId, instituicao);
  }
  @Patch('nivel-escolaridade')
  async alterarNivelEscolaridade(@Req() req: Request, @Body('nivelEscolaridade') nivelEscolaridade: string) {
    if (!req.user || !('userId' in req.user)) {
      throw new Error('Usuário não autenticado ou userId ausente.');
    }
    return this.configuracoesService.alterarNivelEscolaridade((req.user as any).userId, nivelEscolaridade);
  }

}
