import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ConfiguracoesService {
  constructor(private readonly prisma: PrismaService) {}

  async alterarPrimeiroNome(userId: string, primeiroNome: string) {
    return this.prisma.usuario.update({ where: { id: userId }, data: { primeiroNome } });
  }

  async alterarSobrenome(userId: string, sobrenome: string) {
    return this.prisma.usuario.update({ where: { id: userId }, data: { sobrenome } });
  }

  async alterarDataNascimento(userId: string, dataNascimento: string) {
    return this.prisma.usuario.update({ where: { id: userId }, data: { dataNascimento } });
  }

  async alterarInstituicao(userId: string, instituicaoId: string) {
    return this.prisma.usuario.update({ where: { id: userId }, data: { instituicaoId } });
  }

  async alterarNivelEscolaridade(userId: string, escolaridade: string) {
    return this.prisma.usuario.update({ where: { id: userId }, data: { escolaridade: escolaridade as any } });
  }

  async suspenderConta(userId: string) {
    return this.prisma.usuario.update({
      where: { id: userId },
      data: {
        suspenso: true,
        dataSuspensao: new Date(),
      },
    });
  }

  async excluirConta(userId: string) {
    return this.prisma.usuario.delete({
      where: { id: userId },
    });
  }
}
