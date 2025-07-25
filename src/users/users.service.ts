import { Injectable, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { NivelEscolaridade, ObjetivoPlataforma, Usuario } from "@prisma/client";
import { isEmail } from "class-validator";
import { addDays, startOfWeek, endOfWeek, isSameDay } from "date-fns";

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findById(userId: string) {
    return this.prisma.usuario.findUnique({
      where: { id: userId },
    });
  }

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

    let birthDate: Date;
    if (typeof dataNascimento === "string" && /^\d{2}-\d{2}-\d{4}$/.test(dataNascimento)) {
      const [day, month, year] = (dataNascimento as string).split("-").map(Number);
      birthDate = new Date(year, month - 1, day);
    } else {
      birthDate = new Date(dataNascimento as string | number | Date);
    }

    const age = this.calculateAge(birthDate);
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
        dataNascimento: birthDate,
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
    // Se for atualizar instituicaoId, verifique se existe
    if (data.instituicaoId) {
      const instituicao = await this.prisma.instituicao.findUnique({
        where: { id: data.instituicaoId },
      });
      if (!instituicao) {
        throw new BadRequestException("Instituição informada não existe.");
      }
    }
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

    return materias;
  }

  async getMateriasByUserIdOrdenadasPorUltimaRevisao(userId: string) {
    return this.prisma.materia.findMany({
      where: { usuarioId: userId },
    });
  }

  async createMateria(userId: string, data: { nome: string; cor: string; icone: string }) {
    const usuario = await this.prisma.usuario.findUnique({ where: { id: userId } });
    if (!usuario) {
      throw new BadRequestException("Usuário informado não existe.");
    }
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
        ultimaRevisao: null,
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

  async getInstituicaoById(instituicaoId: string) {
    return this.prisma.instituicao.findUnique({
      where: { id: instituicaoId },
      select: { nome: true },
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

  async registrarAtividadeDiaria(userId: string, data: Date) {
    const dataDia = new Date(data.getFullYear(), data.getMonth(), data.getDate());
    const atividade = await this.prisma.atividadeUsuario.findFirst({
      where: {
        usuarioId: userId,
        data: dataDia,
      },
    });
    if (atividade) {
      await this.prisma.atividadeUsuario.update({
        where: { id: atividade.id },
        data: { quantidade: { increment: 1 } },
      });
    } else {
      await this.prisma.atividadeUsuario.create({
        data: {
          usuarioId: userId,
          data: dataDia,
          quantidade: 1,
        },
      });
    }
  }

  async getMetricaSemanal(userId: string) {
    const hoje = new Date();
    const inicioSemana = startOfWeek(hoje, { weekStartsOn: 0 }); // Domingo
    const fimSemana = endOfWeek(hoje, { weekStartsOn: 0 });

    const atividades = await this.prisma.atividadeUsuario.findMany({
      where: {
        usuarioId: userId,
        data: {
          gte: inicioSemana,
          lte: fimSemana,
        },
      },
      orderBy: { data: "asc" },
    });

    const diasSemana = [];
    let totalSemana = 0;
    for (let i = 0; i < 7; i++) {
      const dia = addDays(inicioSemana, i);
      const atividadeDia = atividades.find((a) => isSameDay(a.data, dia));
      diasSemana.push({
        data: dia.toISOString().split("T")[0],
        feito: !!atividadeDia,
        quantidade: atividadeDia?.quantidade || 0,
      });
      totalSemana += atividadeDia?.quantidade || 0;
    }

    const diaHoje = hoje.getDay();
    const diasCompletos = diasSemana.slice(0, diaHoje + 1);
    const rendimentoSemanal = diasCompletos.filter((d) => d.feito).length / diasCompletos.length;

    return {
      diasSemana,
      totalSemana,
      rendimentoSemanal: Number(rendimentoSemanal.toFixed(2)),
    };
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

  async deleteById(userId: string) {
    return this.prisma.usuario.delete({
      where: { id: userId },
    });
  }

  async atualizarUltimaEntradaMateria(materiaId: string) {
    return this.prisma.materia.update({
      where: { id: materiaId },
      data: {
        ultimaRevisao: new Date(),
      },
    });
  }
}
