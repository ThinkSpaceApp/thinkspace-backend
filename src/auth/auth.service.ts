import { Injectable, BadRequestException, UnauthorizedException } from "@nestjs/common";
import { UsersService } from "../users/users.service";
import { v4 as uuidv4 } from "uuid";
import { Resend } from "resend";
import * as bcrypt from "bcrypt";
import * as crypto from "crypto";
import * as dotenv from "dotenv";
import { isEmail } from "class-validator";

dotenv.config();

const RESEND_API_KEY = process.env.RESEND_API_KEY;

const tempRegisterStore: Record<string, any> = {};

@Injectable()
export class AuthService {
  constructor(private readonly usersService: UsersService) {}

  async registrarStep1(registerDto: {
    primeiroNome: string;
    sobrenome: string;
    email: string;
    senha: string;
    confirmarSenha: string;
    dataNascimento: string;
  }) {
    const { email, senha, confirmarSenha, primeiroNome, sobrenome, dataNascimento } = registerDto;

    if (!email || !senha || !confirmarSenha || !primeiroNome || !sobrenome || !dataNascimento) {
      throw new BadRequestException("Todos os campos obrigatórios devem ser preenchidos.");
    }
    if (!isEmail(email)) {
      throw new BadRequestException("Email inválido.");
    }
    if (senha !== confirmarSenha) {
      throw new BadRequestException("As senhas não coincidem.");
    }
    const existingUser = await this.usersService.findByEmail(email);
    if (existingUser) {
      throw new BadRequestException("O e-mail já está em uso. Por favor, utilize outro.");
    }
    const dataNascimentoDate = new Date(dataNascimento);
    if (isNaN(dataNascimentoDate.getTime())) {
      throw new BadRequestException("Data de nascimento inválida.");
    }
    const hashedPassword = await bcrypt.hash(senha, 10);

    tempRegisterStore[email] = {
      id: uuidv4(),
      primeiroNome,
      sobrenome,
      email,
      senha: hashedPassword,
      dataNascimento: dataNascimentoDate,
      reenvios: 0,
      etapa: 'funcao',
    };

    return { message: "Dados iniciais recebidos. Escolha a função (administrador ou usuário comum)." };
  }

  async registrarStep2EscolherFuncao(email: string, funcao: "ADMIN" | "ESTUDANTE") {
    const temp = tempRegisterStore[email];
    if (!temp) throw new BadRequestException("Registro não iniciado.");
    temp.funcao = funcao;
    temp.etapa = 'completar';
    return { message: "Função definida. Complete o cadastro." };
  }

  async registrarStep3Completar(email: string, data: { escolaridade: string; objetivoNaPlataforma: string; areaDeInteresse: string; instituicaoNome: string }) {
    const temp = tempRegisterStore[email];
    if (!temp) throw new BadRequestException("Registro não iniciado.");
    temp.escolaridade = data.escolaridade;
    temp.objetivoNaPlataforma = data.objetivoNaPlataforma;
    temp.areaDeInteresse = data.areaDeInteresse;
    temp.instituicaoNome = data.instituicaoNome;
    temp.etapa = 'verificacao';
    temp.codigoVerificado = crypto.randomInt(10000, 99999).toString();
    temp.codigoExpiracao = new Date(Date.now() + 10 * 60 * 1000);
    temp.reenvios = 0;
    await this.sendVerificationEmail(email, temp.codigoVerificado);
    return { message: "Código de verificação enviado para o e-mail." };
  }

  async reenviarCodigo(email: string) {
    const temp = tempRegisterStore[email];
    if (!temp) throw new BadRequestException("Registro não iniciado.");
    temp.reenvios = (temp.reenvios || 0) + 1;
    if (temp.reenvios >= 3) {
      delete tempRegisterStore[email];
      throw new BadRequestException("Limite de reenvios atingido. Faça o cadastro novamente.");
    }
    temp.codigoVerificado = crypto.randomInt(10000, 99999).toString();
    temp.codigoExpiracao = new Date(Date.now() + 10 * 60 * 1000);
    await this.sendVerificationEmail(email, temp.codigoVerificado);
    return { message: "Novo código enviado para o e-mail." };
  }

  async verificarEmail(email: string, codigo: string) {
    const temp = tempRegisterStore[email];
    if (!temp) throw new BadRequestException("Registro não iniciado.");
    if (temp.codigoVerificado !== codigo) {
      throw new BadRequestException("Código de verificação inválido.");
    }
    if (temp.codigoExpiracao && new Date() > temp.codigoExpiracao) {
      throw new BadRequestException("O código expirou.");
    }

    const instituicao = await this.usersService.getOrCreateInstituicao(temp.instituicaoNome);

    const user = await this.usersService.create({
      id: temp.id,
      primeiroNome: temp.primeiroNome,
      sobrenome: temp.sobrenome,
      email: temp.email,
      senha: temp.senha,
      dataNascimento: temp.dataNascimento,
      funcao: temp.funcao,
      escolaridade: temp.escolaridade,
      objetivoNaPlataforma: temp.objetivoNaPlataforma,
      areaDeInteresse: temp.areaDeInteresse,
      instituicaoId: instituicao.id,
      emailVerificado: true,
      criadoEm: new Date(),
      atualizadoEm: new Date(),
    });
    delete tempRegisterStore[email];
    return { message: "E-mail verificado e cadastro concluído.", user };
  }

  private async sendVerificationEmail(email: string, codigo: string) {
    const resend = new Resend(RESEND_API_KEY);
    await resend.emails.send({
      from: "noreply@thinkspace.app.br",
      to: email,
      subject: "Código de verificação - ThinkSpace",
      html: `
        <div style="font-family: Arial, sans-serif; text-align: center; color: #333;">
          <h1 style="color:rgb(146, 102, 204);">Código de verificação</h1>
          <p>Seu código é:</p>
          <div style="font-size: 24px; font-weight: bold; color:rgb(153, 98, 175); margin: 20px 0;">
            ${codigo}
          </div>
          <p>O código expira em 10 minutos.</p>
        </div>
      `,
    });
  }

  async sendPasswordResetCode(email: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new BadRequestException("Usuário não encontrado.");
    }
    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiration = new Date(Date.now() + 10 * 60 * 1000);

    await this.usersService.update(user.id, {
      codigoVerificado: resetCode,
      codigoExpiracao: expiration,
    });

    const resend = new Resend(RESEND_API_KEY);
    try {
      await resend.emails.send({
        from: "noreply@thinkspace.app.br",
        to: email,
        subject: "🔒 Redefinição de senha - ThinkSpace",
        html: `
          <div style="font-family: Arial, sans-serif; text-align: center; color: #333;">
            <img src="https://i.ibb.co/HpC6njNJ/Group-4-2.png" alt="ThinkSpace Logo" style="width: 150px; margin-bottom: 20px;" />
            <h1 style="color:rgb(146, 102, 204);">🔒 Redefinição de senha</h1>
            <p>Recebemos uma solicitação para redefinir a senha da sua conta no <strong>ThinkSpace</strong>.</p>
            <p>Para continuar, utilize o código abaixo. Ele é válido por <strong>10 minutos</strong>:</p>
            <div style="font-size: 28px; font-weight: bold; color:rgb(153, 98, 175); margin: 24px 0;">
              ${resetCode}
            </div>
            <p>Se você não solicitou a redefinição de senha, pode ignorar este e-mail com segurança.<br>
            Caso tenha dúvidas, entre em contato com nosso suporte.</p>
            <p style="margin-top: 30px;">💡 <strong>Equipe ThinkSpace</strong></p>
            <hr style="margin: 20px 0; border: none; border-top: 1px solid #ddd;" />
            <p style="font-size: 12px; color: #777;">Este é um e-mail automático. Por favor, não responda.</p>
          </div>
        `,
      });
    } catch (error) {
      throw new BadRequestException("Erro ao enviar o e-mail de redefinição de senha.");
    }
    return { message: "Código de redefinição enviado para o e-mail." };
  }

  async verifyPasswordResetCode(email: string, code: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user || user.codigoVerificado !== code) {
      throw new BadRequestException("Código inválido.");
    }
    if (user.codigoExpiracao && new Date() > user.codigoExpiracao) {
      throw new BadRequestException("O código expirou.");
    }
    return { message: "Código válido. Você pode redefinir sua senha." };
  }

  async resetPassword(email: string, code: string, novaSenha: string, confirmarSenha: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user || user.codigoVerificado !== code) {
      throw new BadRequestException("Código inválido.");
    }
    if (user.codigoExpiracao && new Date() > user.codigoExpiracao) {
      throw new BadRequestException("O código expirou.");
    }
    if (novaSenha !== confirmarSenha) {
      throw new BadRequestException("As senhas não coincidem.");
    }

    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(novaSenha)) {
      throw new BadRequestException(
        "Crie uma nova senha com pelo menos 8 caracteres, incluindo letras, números e símbolos.",
      );
    }
    const hashedPassword = await bcrypt.hash(novaSenha, 10);
    await this.usersService.update(user.id, {
      senha: hashedPassword,
      codigoVerificado: undefined,
      codigoExpiracao: undefined,
    });
    return { message: "Senha redefinida com sucesso." };
  }

  async validateUser(email: string, senha: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException("Usuário não encontrado.");
    }
    if (!user.emailVerificado) {
      throw new UnauthorizedException(
        "E-mail não verificado. Por favor, verifique seu e-mail antes de fazer login.",
      );
    }
    const isPasswordValid = await bcrypt.compare(senha, user.senha);
    if (!isPasswordValid) {
      throw new UnauthorizedException("Senha incorreta.");
    }
    const { senha: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }
}
