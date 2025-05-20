import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NivelEscolaridade, ObjetivoPlataforma, Usuario } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { isEmail } from 'class-validator';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userData: Partial<Usuario>) {
    const { email, senha, dataNascimento, escolaridade, objetivoNaPlataforma } = userData;

    if (!isEmail(email)) {
      throw new BadRequestException('Email inválido.');
    }
    const existingUser = await this.prisma.usuario.findUnique({ where: { email } });
    if (existingUser) {
      throw new BadRequestException('Email já está em uso.');
    }
    const emailDomain = email?.split('@')[1];
    if (!emailDomain) {
      throw new BadRequestException('Email inválido.');
    }
    if (!senha) {
      throw new BadRequestException('Senha é obrigatória.');
    }
    const passwordValidationErrors = this.validatePassword(senha);
    if (passwordValidationErrors.length > 0) {
      throw new BadRequestException(
        `A senha não atende aos requisitos: ${passwordValidationErrors.join(', ')}.`,
      );
    }

    if (!dataNascimento) {
      throw new BadRequestException('Data de nascimento é obrigatória.');
    }
    const age = this.calculateAge(new Date(dataNascimento));
    if (age < 13) {
      throw new BadRequestException('Usuários menores de 13 anos não podem se registrar.');
    }
    if (age > 125) {
      throw new BadRequestException('Data de nascimento inválida. Valor muito alto.');
    }

    if (escolaridade && !Object.values(NivelEscolaridade).includes(escolaridade)) {
      throw new BadRequestException('Escolaridade inválida.');
    }
    if (objetivoNaPlataforma && !Object.values(ObjetivoPlataforma).includes(objetivoNaPlataforma)) {
      throw new BadRequestException('Objetivo na plataforma deve estar entre as opções selecionadas.');
    }

    const hashedPassword = await bcrypt.hash(senha, 10);

    return this.prisma.usuario.create({
      data: {
        ...userData,
        instituicaoId: userData.instituicaoId || null,
        email: email as string,
        senha: hashedPassword,
        dataNascimento: userData.dataNascimento ? new Date(userData.dataNascimento) : new Date(),
        primeiroNome: userData.primeiroNome || '',
        sobrenome: userData.sobrenome || '',
        nomeCompleto: `${userData.primeiroNome || ''} ${userData.sobrenome || ''}`.trim(),
        areaDeInteresse: userData.areaDeInteresse || '',
        codigoVerificado: userData.codigoVerificado || '', 
        codigoExpiracao: userData.codigoExpiracao ? new Date(userData.codigoExpiracao) : new Date(),
      },
    });
  }

  async findByEmail(email: string) {
    return this.prisma.usuario.findUnique({
      where: { email },
    });
  }

  async findByVerificationCode(code: string) {
    return this.prisma.usuario.findFirst({
      where: { codigoVerificado: code },
    });
  }

  async update(userId: string, data: Partial<Usuario>) {
    return this.prisma.usuario.update({
      where: { id: userId },
      data,
    });
  }

  private validatePassword(password: string): string[] {
    const errors: string[] = [];
    if (password.length < 8) {
      errors.push('A senha deve ter pelo menos 8 caracteres');
    }
    if (!/[A-Z]/.test(password)) {
      errors.push('A senha deve conter pelo menos uma letra maiúscula');
    }
    if (!/[a-z]/.test(password)) {
      errors.push('A senha deve conter pelo menos uma letra minúscula');
    }
    if (!/\d/.test(password)) {
      errors.push('A senha deve conter pelo menos um número');
    }
    if (!/[@$!%*?&]/.test(password)) {
      errors.push('A senha deve conter pelo menos um caractere especial (@$!%*?&)');
    }
    return errors;
  }

  private calculateAge(birthDate: Date): number {
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  }
}
