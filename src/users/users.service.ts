import { Injectable, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { NivelEscolaridade, ObjetivoPlataforma, Usuario } from "@prisma/client";
import { isEmail } from "class-validator";

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userData: Partial<Usuario>) {
    const { email, senha, dataNascimento, escolaridade, objetivoNaPlataforma } = userData;

    if (!isEmail(email)) {
      throw new BadRequestException("Email inválido.");
    }
    const existingUser = await this.prisma.usuario.findUnique({ where: { email } });
    if (existingUser) {
      throw new BadRequestException("Email já está em uso.");
    }
    const emailDomain = email?.split("@")[1];
    if (!emailDomain) {
      throw new BadRequestException("Email inválido.");
    }
    if (!senha) {
      throw new BadRequestException("Senha é obrigatória.");
    }
    const passwordValidationErrors = this.validatePassword(senha);
    if (passwordValidationErrors.length > 0) {
      throw new BadRequestException(
        `A senha não atende aos requisitos: ${passwordValidationErrors.join(", ")}.`,
      );
    }

    if (!dataNascimento) {
      throw new BadRequestException("Data de nascimento é obrigatória.");
    }
    const age = this.calculateAge(new Date(dataNascimento));
    if (age < 13) {
      throw new BadRequestException("Usuários menores de 13 anos não podem se registrar.");
    }
    if (age > 125) {
      throw new BadRequestException("Data de nascimento inválida. Valor muito alto.");
    }

    if (escolaridade && !Object.values(NivelEscolaridade).includes(escolaridade)) {
      throw new BadRequestException("Escolaridade inválida.");
    }
    if (objetivoNaPlataforma && !Object.values(ObjetivoPlataforma).includes(objetivoNaPlataforma)) {
      throw new BadRequestException(
        "Objetivo na plataforma deve estar entre as opções selecionadas.",
      );
    }

    return this.prisma.usuario.create({
      data: {
        ...userData,
        instituicaoId: userData.instituicaoId || null,
        email: email as string,
        senha: userData.senha!,
        dataNascimento: userData.dataNascimento ? new Date(userData.dataNascimento) : new Date(),
        primeiroNome: userData.primeiroNome || "",
        sobrenome: userData.sobrenome || "",
        nomeCompleto: `${userData.primeiroNome || ""} ${userData.sobrenome || ""}`.trim(),
        areaDeInteresse: userData.areaDeInteresse || "",
        codigoVerificado: userData.codigoVerificado || "",
        codigoExpiracao: userData.codigoExpiracao ? new Date(userData.codigoExpiracao) : new Date(),
      },
    });
  }

  async findByEmail(email: string) {
    return this.prisma.usuario.findUnique({
      where: { email },
      include: { experiencia: true },
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

  async completeProfile(
    email: string,
    data: {
      escolaridade: string;
      objetivoNaPlataforma: string;
      areaDeInteresse: string;
      instituicaoNome: string;
    },
  ) {
    const user = await this.prisma.usuario.findUnique({ where: { email } });
    if (!user) {
      throw new Error("Usuário não encontrado.");
    }

    return this.prisma.usuario.update({
      where: { email },
      data: {
        escolaridade: data.escolaridade as NivelEscolaridade,
        objetivoNaPlataforma: data.objetivoNaPlataforma as ObjetivoPlataforma,
        areaDeInteresse: data.areaDeInteresse,
        Instituicao: {
          connectOrCreate: {
            where: { nome: data.instituicaoNome },
            create: { nome: data.instituicaoNome },
          },
        },
      },
    });
  }

  async getSalasEstudoByEmail(email: string) {
    const user = await this.prisma.usuario.findUnique({
      where: { email },
      include: {
        membroSalas: {
          include: {
            sala: true,
          },
        },
        salasModeradas: true,
      },
    });
    if (!user) {
      throw new BadRequestException("Usuário não encontrado.");
    }

    const salasMembro = user.membroSalas.map((m) => m.sala);
    const salasModerador = user.salasModeradas;
    return {
      salasMembro,
      salasModerador,
    };
  }

  async getMateriasByUserId(userId: string) {
    const materias = await this.prisma.materia.findMany({
      where: { usuarioId: userId },
      include: {
        materiais: true,
      },
    });

    return materias.map((materia) => {
      let tempoFormatado = `${materia.tempoAtivo} min`;
      if (materia.tempoAtivo >= 60) {
        const horas = Math.floor(materia.tempoAtivo / 60);
        const minutos = materia.tempoAtivo % 60;
        tempoFormatado = minutos > 0 ? `${horas} h e ${minutos} min` : `${horas} h`;
      }
      return {
        ...materia,
        tempoAtivoFormatado: tempoFormatado,
      };
    });
  }

  async getMateriasByUserIdOrdenadasPorUltimaRevisao(userId: string) {
    return this.prisma.materia.findMany({
      where: { usuarioId: userId },
      orderBy: { ultimaRevisao: "desc" },
    });
  }

  async createMateria(userId: string, data: { nome: string; cor: string; icone: string }) {
    const allowedColors = ["SALMAO", "ROSA", "LILAS", "ROXO"];
    if (!allowedColors.includes(data.cor)) {
      throw new BadRequestException("Cor inválida.");
    }
    return this.prisma.materia.create({
      data: {
        nome: data.nome,
        cor: data.cor as any,
        icone: data.icone,
        usuarioId: userId,
      },
    });
  }

  async addMaterialToMateria(materiaId: string, materialId: string) {
    return this.prisma.materia.update({
      where: { id: materiaId },
      data: {
        materiais: {
          connect: { id: materialId },
        },
      },
    });
  }

  async atualizarTempoAtivoEMarcarRevisao(materiaId: string, minutos: number) {
    return this.prisma.materia.update({
      where: { id: materiaId },
      data: {
        tempoAtivo: { increment: minutos },
        ultimaRevisao: new Date(),
      },
    });
  }

  async getOrCreateInstituicao(nome: string) {
    if (!nome) {
      throw new BadRequestException("Nome da instituição é obrigatório.");
    }
    let instituicao = await this.prisma.instituicao.findUnique({
      where: { nome },
    });
    if (!instituicao) {
      instituicao = await this.prisma.instituicao.create({
        data: { nome },
      });
    }
    return instituicao;
  }

  async getNotificacoesByUserId(userId: string) {
    const notificacoes = await this.prisma.notificacao.findMany({
      where: { usuarioId: userId },
      orderBy: { data: "desc" },
    });
    return notificacoes;
  }

  async getMateriaById(id: string) {
    return this.prisma.materia.findUnique({ where: { id } });
  }

  async editarMateria(id: string, data: { nome?: string; cor?: string; icone?: string }) {
    return this.prisma.materia.update({
      where: { id },
      data: {
        ...(data.nome && { nome: data.nome }),
        ...(data.cor && { cor: data.cor as any }),
        ...(data.icone && { icone: data.icone }),
      },
    });
  }

  async excluirMateria(id: string) {
    return this.prisma.materia.delete({
      where: { id },
    });
  }

  private validatePassword(password: string): string[] {
    const errors: string[] = [];
    if (password.length < 8) {
      errors.push("A senha deve ter pelo menos 8 caracteres");
    }
    if (!/[A-Z]/.test(password)) {
      errors.push("A senha deve conter pelo menos uma letra maiúscula");
    }
    if (!/[a-z]/.test(password)) {
      errors.push("A senha deve conter pelo menos uma letra minúscula");
    }
    if (!/\d/.test(password)) {
      errors.push("A senha deve conter pelo menos um número");
    }
    if (!/[@$!%*?&]/.test(password)) {
      errors.push("A senha deve conter pelo menos um caractere especial (@$!%*?&)");
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
