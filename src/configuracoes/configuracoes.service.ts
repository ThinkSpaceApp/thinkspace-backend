import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class ConfiguracoesService {
  private emailTrocaMap = new Map<string, string>();
  private senhaTrocaMap = new Map<string, string>();
  private codigoVerificacaoMap = new Map<string, string>();
  private codigoVerificacaoSenhaMap = new Map<string, string>();

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

  async alterarInstituicao(userId: string, instituicaoNome: string) {
    if (!instituicaoNome || typeof instituicaoNome !== 'string') {
      throw new Error('Nome da instituição inválido.');
    }
    let instituicao = await this.prisma.instituicao.findUnique({ where: { nome: instituicaoNome } });
    if (!instituicao) {
      instituicao = await this.prisma.instituicao.create({ data: { nome: instituicaoNome } });
    }
    return this.prisma.usuario.update({ where: { id: userId }, data: { instituicaoId: instituicao.id } });
  }

  async alterarNivelEscolaridade(userId: string, escolaridade: string) {
    return this.prisma.usuario.update({
      where: { id: userId },
      data: { escolaridade: escolaridade as any },
    });
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

  async solicitarTrocaEmail(userId: string, email: string) {
    this.emailTrocaMap.set(userId, email);
    return { message: 'Solicitação de troca de email registrada. Siga as instruções enviadas.', emailTemporario: email };
  }

  async enviarCodigoTrocaEmail(userId: string) {
    const email = this.emailTrocaMap.get(userId);
    if (!email) {
      return { success: false, message: 'Nenhum email registrado para troca de email.' };
    }
    const codigo = Math.floor(100000 + Math.random() * 900000).toString();
    this.codigoVerificacaoMap.set(userId, codigo);

    const RESEND_API_KEY = process.env.RESEND_API_KEY || 'YOUR_RESEND_API_KEY';
    const { Resend } = await import('resend');
    const resend = new Resend(RESEND_API_KEY);
    await resend.emails.send({
      from: 'noreply@thinkspace.app.br',
      to: email,
      subject: '🔄Código de verificação para troca de email',
      html: `
        <div style="font-family: Arial, sans-serif; text-align: center; color: #333;">
          <img src="https://i.imgur.com/4JBPx3E.png" alt="ThinkSpace Logo" style="height: 80px; width: 80px; margin-bottom: 20px;" />
          <h1 style="color:rgb(146, 102, 204);">🔄 Troca de email no ThinkSpace</h1>
          <p style="color:#333;">Você solicitou a troca do seu email na plataforma. Para confirmar, utilize o código abaixo. Ele é válido por <strong>10 minutos</strong>:</p>
          <div style="font-size: 24px; font-weight: bold; color:rgb(153, 98, 175); margin: 20px 0;">
            ${codigo}
          </div>
          <p style="color:#333;">Se você não solicitou a troca, ignore este e-mail. Caso tenha dúvidas, entre em contato conosco.</p>
          <p style="margin-top: 30px; color:#333;">💡 <strong>Equipe ThinkSpace</strong></p>
          <hr style="margin: 20px 0; border: none; border-top: 1px solid #ddd;" />
          <p style="font-size: 12px; color: #777;">Este é um e-mail automático. Por favor, não responda.</p>
        </div>
      `,
    });
    return { message: 'Código de verificação enviado para o email.' };
  }

  async verificarCodigoTrocaEmail(userId: string, codigo: string) {
    const codigoSalvo = this.codigoVerificacaoMap.get(userId);
    if (!codigoSalvo) {
      return { success: false, message: 'Nenhum código de verificação encontrado para este usuário.' };
    }
    if (codigoSalvo !== codigo) {
      return { success: false, message: 'Código de verificação inválido.' };
    }
    return { success: true, message: 'Código verificado com sucesso.' };
  }

  async confirmarTrocaEmail(userId: string, novoEmail: string, codigo: string) {
    const codigoSalvo = this.codigoVerificacaoMap.get(userId);
    if (!codigoSalvo) {
      return { success: false, message: 'Nenhum código de verificação encontrado para este usuário.' };
    }
    if (codigoSalvo !== codigo) {
      return { success: false, message: 'Código de verificação inválido.' };
    }
    await this.prisma.usuario.update({ where: { id: userId }, data: { email: novoEmail } });
    this.codigoVerificacaoMap.delete(userId);
    this.emailTrocaMap.delete(userId);
    return { success: true, message: 'Email alterado com sucesso.' };
  }

  async solicitarTrocaSenha(userId: string, email: string) {
    this.senhaTrocaMap.set(userId, email);
    return { message: 'Solicitação de troca de senha registrada. Siga as instruções enviadas.', emailTemporario: email };
  }

  async enviarCodigoTrocaSenha(userId: string) {
    const email = this.senhaTrocaMap.get(userId);
    if (!email) {
      return { success: false, message: 'Nenhum email registrado para troca de senha.' };
    }
    const codigo = Math.floor(100000 + Math.random() * 900000).toString();
    this.codigoVerificacaoSenhaMap.set(userId, codigo);

    const RESEND_API_KEY = process.env.RESEND_API_KEY || 'YOUR_RESEND_API_KEY';
    const { Resend } = await import('resend');
    const resend = new Resend(RESEND_API_KEY);
    await resend.emails.send({
      from: 'noreply@thinkspace.app.br',
      to: email,
      subject: '🔄Código de verificação para troca de senha',
      html: `
        <div style="font-family: Arial, sans-serif; text-align: center; color: #333;">
          <img src="https://i.imgur.com/4JBPx3E.png" alt="ThinkSpace Logo" style="height: 80px; width: 80px; margin-bottom: 20px;" />
          <h1 style="color:rgb(146, 102, 204);">🔄 Troca de senha no ThinkSpace</h1>
          <p style="color:#333;">Você solicitou a troca da sua senha na plataforma. Para confirmar, utilize o código abaixo. Ele é válido por <strong>10 minutos</strong>:</p>
          <div style="font-size: 24px; font-weight: bold; color:rgb(153, 98, 175); margin: 20px 0;">
            ${codigo}
          </div>
          <p style="color:#333;">Se você não solicitou a troca, ignore este e-mail. Caso tenha dúvidas, entre em contato conosco.</p>
          <p style="margin-top: 30px; color:#333;">💡 <strong>Equipe ThinkSpace</strong></p>
          <hr style="margin: 20px 0; border: none; border-top: 1px solid #ddd;" />
          <p style="font-size: 12px; color: #777;">Este é um e-mail automático. Por favor, não responda.</p>
        </div>
      `,
    });
    return { message: 'Código de verificação enviado para o email.' };
  }

  async verificarCodigoTrocaSenha(userId: string, codigo: string) {
    const codigoSalvo = this.codigoVerificacaoSenhaMap.get(userId);
    if (!codigoSalvo) {
      return { success: false, message: 'Nenhum código de verificação encontrado para este usuário.' };
    }
    if (codigoSalvo !== codigo) {
      return { success: false, message: 'Código de verificação inválido.' };
    }
    return { success: true, message: 'Código verificado com sucesso.' };
  }

  async confirmarTrocaSenha(userId: string, novaSenha: string, codigo: string) {
    const codigoSalvo = this.codigoVerificacaoSenhaMap.get(userId);
    if (!codigoSalvo) {
      return { success: false, message: 'Nenhum código de verificação encontrado para este usuário.' };
    }
    if (codigoSalvo !== codigo) {
      return { success: false, message: 'Código de verificação inválido.' };
    }
    await this.prisma.usuario.update({ where: { id: userId }, data: { senha: novaSenha } });
    this.codigoVerificacaoSenhaMap.delete(userId);
    this.senhaTrocaMap.delete(userId);
    return { success: true, message: 'Senha alterada com sucesso.' };
  }
}
