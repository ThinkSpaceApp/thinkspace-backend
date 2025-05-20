import { Injectable, BadRequestException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { Resend } from 'resend';
import * as crypto from 'crypto';
import * as dotenv from 'dotenv';

dotenv.config();

const RESEND_API_KEY = process.env.RESEND_API_KEY;

@Injectable()
export class AuthService {
  constructor(private readonly usersService: UsersService) {}

  async register(registerDto: RegisterDto) {
    const { email, password, confirmPassword } = registerDto;

    if (password !== confirmPassword) {
      throw new BadRequestException('As senhas não coincidem.');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const verificationCode = crypto.randomInt(10000, 99999).toString();
    const expirationTime = new Date(Date.now() + 10 * 60 * 1000); 
    
    const user = await this.usersService.create({
      id: uuidv4(),
      ...registerDto,
      senha: hashedPassword,
      codigoVerificado: verificationCode,
      codigoExpiracao: expirationTime, 
    });

    const resend = new Resend(RESEND_API_KEY);
    try {
      await resend.emails.send({
        from: 'noreply@thinkspace.com',
        to: email || '',
        subject: '🎉 Bem-vindo ao ThinkSpace! Verifique seu e-mail',
        html: `
          <div style="font-family: Arial, sans-serif; text-align: center; color: #333;">
            <img src="https://seusite.com/logo.png" alt="ThinkSpace Logo" style="width: 150px; margin-bottom: 20px;" />
            <h1 style="color:rgb(146, 102, 204);">🎉 Bem-vindo ao ThinkSpace!</h1>
            <p>Obrigado por se registrar na nossa plataforma. Estamos muito felizes em tê-lo conosco! 😊</p>
            <p>Por favor, use o código abaixo para verificar seu e-mail. Ele é válido por <strong>10 minutos</strong>:</p>
            <div style="font-size: 24px; font-weight: bold; color:rgb(153, 98, 175); margin: 20px 0;">
              ${verificationCode}
            </div>
            <p>Se você não se registrou, ignore este e-mail. Caso tenha dúvidas, entre em contato conosco.</p>
            <p style="margin-top: 30px;">💡 <strong>Equipe ThinkSpace</strong></p>
            <hr style="margin: 20px 0; border: none; border-top: 1px solid #ddd;" />
            <p style="font-size: 12px; color: #777;">Este é um e-mail automático. Por favor, não responda.</p>
          </div>
        `,
      });
    } catch (error) {
      throw new BadRequestException('Erro ao enviar o e-mail de verificação.');
    }

    return { message: 'Usuário registrado com sucesso. Por favor, verifique seu e-mail.' };
  }

  async verifyCode(code: string) {
    const user = await this.usersService.findByVerificationCode(code);

    if (!user) {
      throw new BadRequestException('Código de verificação inválido ou expirado.');
    }

    const now = new Date();
    if (user.codigoExpiracao && now > user.codigoExpiracao) {
      throw new BadRequestException('O código de verificação expirou. Por favor, solicite um novo.');
    }

    await this.usersService.update(user.id, { codigoVerificado: undefined, codigoExpiracao: undefined, emailVerificado: true });

    return { message: 'E-mail verificado com sucesso.' };
  }
}
