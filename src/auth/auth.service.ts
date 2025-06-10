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

@Injectable()
export class AuthService {
  constructor(private readonly usersService: UsersService) {}

  async register(registerDto: {
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

    if (senha !== confirmarSenha) {
      throw new BadRequestException("As senhas não coincidem.");
    }

    // Validação extra: dataNascimento deve ser uma data válida
    const dataNascimentoDate = new Date(dataNascimento);
    if (isNaN(dataNascimentoDate.getTime())) {
      throw new BadRequestException("Data de nascimento inválida.");
    }

    const hashedPassword = await bcrypt.hash(senha, 10);

    const codigoVerificado = crypto.randomInt(10000, 99999).toString();
    const codigoExpiracao = new Date(Date.now() + 10 * 60 * 1000);

    const user = await this.usersService.create({
      id: uuidv4(),
      primeiroNome,
      sobrenome,
      email,
      senha: hashedPassword,
      dataNascimento: dataNascimentoDate,
      codigoVerificado,
      codigoExpiracao,
    });

    const resend = new Resend(RESEND_API_KEY);
    try {
      await resend.emails.send({
        from: "noreply@thinkspace.app.br",
        to: email,
        subject: "Bem-vindo(a) ao ThinkSpace! Verifique seu e-mail 🎉",
        html: `
          <div style="font-family: Arial, sans-serif; text-align: center; color: #333;">
            <img src="https://i.ibb.co/HpC6njNJ/Group-4-2.png" alt="ThinkSpace Logo" style="width: 150px; margin-bottom: 20px;" />
            <h1 style="color:rgb(146, 102, 204);">Bem-vindo ao ThinkSpace! 🎉</h1>
            <p style="color:#333;">Obrigado por se registrar na nossa plataforma. Estamos muito felizes em tê-lo conosco! 😊</p>
            <p style="color:#333;">Por favor, use o código abaixo para verificar seu e-mail. Ele é válido por <strong>10 minutos</strong>:</p>
            <div style="font-size: 24px; font-weight: bold; color:rgb(153, 98, 175); margin: 20px 0;">
              ${codigoVerificado}
            </div>
            <p style="color:#333;">Se você não se registrou, ignore este e-mail. Caso tenha dúvidas, entre em contato conosco.</p>
            <p style="margin-top: 30px; color:#333;">💡 <strong>Equipe ThinkSpace</strong></p>
            <hr style="margin: 20px 0; border: none; border-top: 1px solid #ddd;" />
            <p style="font-size: 12px; color: #777;">Este é um e-mail automático. Por favor, não responda.</p>
          </div>
        `,
      });
    } catch (error) {
      throw new BadRequestException("Erro ao enviar o e-mail de verificação.");
    }

    return { message: "Usuário registrado com sucesso. Por favor, verifique seu e-mail." };
  }

  async verifyCode(codigoVerificado: string) {
    const user = await this.usersService.findByVerificationCode(codigoVerificado);

    if (!user) {
      throw new BadRequestException("Código de verificação inválido ou expirado.");
    }

    const now = new Date();
    if (user.codigoExpiracao && now > user.codigoExpiracao) {
      throw new BadRequestException(
        "O código de verificação expirou. Por favor, solicite um novo.",
      );
    }

    await this.usersService.update(user.id, {
      codigoVerificado: undefined,
      codigoExpiracao: undefined,
      emailVerificado: true,
    });

    return { message: "E-mail verificado com sucesso." };
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

  async sendPasswordResetCode(email: string) {
    if (!isEmail(email)) {
      throw new BadRequestException("Email inválido.");
    }
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
}
