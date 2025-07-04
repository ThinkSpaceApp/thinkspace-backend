import { Injectable, BadRequestException, UnauthorizedException } from "@nestjs/common";
import { UsersService } from "../users/users.service";
import { v4 as uuidv4 } from "uuid";
import { Resend } from "resend";
import * as bcrypt from "bcrypt";
import * as crypto from "crypto";
import * as dotenv from "dotenv";
import { isEmail } from "class-validator";
import { JwtService } from "@nestjs/jwt";

dotenv.config();

const RESEND_API_KEY = process.env.RESEND_API_KEY;

const tempRegisterStore: Record<string, any> = {};

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

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
    // Validação de senha forte
    const passwordErrors: string[] = [];
    if (senha.length < 8) {
      passwordErrors.push("A senha deve ter pelo menos 8 caracteres");
    }
    if (!/[A-Z]/.test(senha)) {
      passwordErrors.push("A senha deve conter pelo menos uma letra maiúscula");
    }
    if (!/[a-z]/.test(senha)) {
      passwordErrors.push("A senha deve conter pelo menos uma letra minúscula");
    }
    if (!/\d/.test(senha)) {
      passwordErrors.push("A senha deve conter pelo menos um número");
    }
    if (!/[@$!%*?&]/.test(senha)) {
      passwordErrors.push("A senha deve conter pelo menos um caractere especial (@$!%*?&)");
    }
    if (passwordErrors.length > 0) {
      throw new BadRequestException(
        `A senha não atende aos requisitos: ${passwordErrors.join(", ")}.`,
      );
    }
    if (senha !== confirmarSenha) {
      throw new BadRequestException("As senhas não coincidem.");
    }
    const existingUser = await this.usersService.findByEmail(email);
    if (existingUser) {
      throw new BadRequestException("O e-mail já está em uso. Por favor, utilize outro.");
    }
    // Validação de data de nascimento e idade mínima
    if (!dataNascimento) {
      throw new BadRequestException("Data de nascimento é obrigatória.");
    }
    let birthDate: Date;
    if (typeof dataNascimento === "string" && /^\d{2}-\d{2}-\d{4}$/.test(dataNascimento)) {
      const [day, month, year] = dataNascimento.split("-").map(Number);
      birthDate = new Date(year, month - 1, day);
    } else {
      birthDate = new Date(dataNascimento);
    }
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    if (age < 13) {
      throw new BadRequestException("Usuários menores de 13 anos não podem se registrar.");
    }
    if (age > 125) {
      throw new BadRequestException("Data de nascimento inválida. Valor muito alto.");
    }
    const hashedPassword = await bcrypt.hash(senha, 10);

    tempRegisterStore[email] = {
      id: uuidv4(),
      primeiroNome,
      sobrenome,
      email,
      senha: hashedPassword,
      dataNascimento: birthDate,
      reenvios: 0,
      etapa: "funcao",
    };

    return {
      message: "Dados iniciais recebidos. Escolha a função (administrador ou usuário comum).",
    };
  }

  async registrarStep2EscolherFuncao(email: string, funcao: "ADMIN" | "ESTUDANTE") {
    const temp = tempRegisterStore[email];
    if (!temp) throw new BadRequestException("Registro não iniciado.");
    temp.funcao = funcao;
    temp.etapa = "completar";
    return { message: "Função definida. Complete o cadastro." };
  }

  async registrarStep3Completar(
    email: string,
    data: {
      escolaridade: string;
      objetivoNaPlataforma: string;
      areaDeInteresse: string;
      instituicaoNome: string;
    },
  ) {
    const temp = tempRegisterStore[email];
    if (!temp) throw new BadRequestException("Registro não iniciado.");
    temp.escolaridade = data.escolaridade;
    temp.objetivoNaPlataforma = data.objetivoNaPlataforma;
    temp.areaDeInteresse = data.areaDeInteresse;
    temp.instituicaoNome = data.instituicaoNome;
    temp.etapa = "verificacao";
    // Gera código de 5 dígitos e salva corretamente
    temp.codigoVerificado = await this.gerarCodigoVerificadoUnico();
    temp.codigoExpiracao = new Date(Date.now() + 10 * 60 * 1000);
    temp.reenvios = 0;
    // Salva o código também em tempRegisterStore para garantir leitura correta na verificação
    tempRegisterStore[email] = temp;
    await this.sendVerificationEmail(email, temp.codigoVerificado);
    return { message: "Código de verificação enviado para o e-mail." };
  }

  async gerarCodigoVerificadoUnico() {
    let codigo: string;
    let tentativas = 0;
    do {
      codigo = Math.floor(10000 + Math.random() * 90000).toString();
      // Verifica se já existe no registro temporário
      const existeNoTemp = Object.values(tempRegisterStore).some(
        (t) => t.codigoVerificado === codigo,
      );
      // Verifica se já existe no banco
      const existente = await this.usersService.findByVerificationCode(codigo);
      if (!existeNoTemp && !existente) break;
      tentativas++;
    } while (tentativas < 10);
    if (tentativas >= 10) throw new Error("Não foi possível gerar um código de verificação único.");
    return codigo;
  }

  async reenviarCodigo(email: string) {
    const temp = tempRegisterStore[email];
    if (!temp) throw new BadRequestException("Registro não iniciado.");
    temp.reenvios = (temp.reenvios || 0) + 1;
    if (temp.reenvios >= 3) {
      delete tempRegisterStore[email];
      throw new BadRequestException("Limite de reenvios atingido. Faça o cadastro novamente.");
    }
    temp.codigoVerificado = await this.gerarCodigoVerificadoUnico();
    temp.codigoExpiracao = new Date(Date.now() + 10 * 60 * 1000);
    tempRegisterStore[email] = temp;

    const resend = new Resend(RESEND_API_KEY);
    await resend.emails.send({
      from: "noreply@thinkspace.app.br",
      to: email,
      subject: "📫 Reenvio do código de verificação - ThinkSpace",
      html: `
        <div style="font-family: Arial, sans-serif; text-align: center; color: #333;">
          <img src="https://i.imgur.com/4JBPx3E.png" alt="ThinkSpace Logo" style="hight: full; width: full; margin-bottom: 20px;" />
          <h1 style="color:rgb(146, 102, 204);">📫 Reenvio do código de verificação</h1>
          <p style="color:#333;">Você solicitou o reenvio do código de verificação para concluir seu cadastro no <strong>ThinkSpace</strong>.</p>
          <p style="color:#333;">Use o código abaixo para verificar seu e-mail. Ele é válido por <strong>10 minutos</strong>:</p>
          <div style="font-size: 24px; font-weight: bold; color:rgb(151,103,248); margin: 20px 0;">
            ${temp.codigoVerificado}
          </div>
          <p style="color:#333;">Atenção: você tem até <strong>3 tentativas</strong> para reenviar o código. Caso não conclua a verificação após 3 reenvios, seu cadastro será <strong>deletado</strong> e será necessário refazer todo o processo.</p>
          <p style="color:#333;">Se você não solicitou o reenvio, ignore este e-mail.</p>
          <p style="margin-top: 30px; color:#333;">💡 <strong>Equipe ThinkSpace</strong></p>
          <hr style="margin: 20px 0; border: none; border-top: 1px solid #ddd;" />
          <p style="font-size: 12px; color: #777;">Este é um e-mail automático. Por favor, não responda.</p>
        </div>
      `,
    });

    return { message: "Novo código enviado para o e-mail." };
  }

  async verificarEmail(email: string, codigo: string) {
    const temp = tempRegisterStore[email];
    if (!temp) throw new BadRequestException("Registro não iniciado.");
    // Corrija para comparar como string e garantir igualdade exata
    if (String(temp.codigoVerificado) !== String(codigo)) {
      throw new BadRequestException("Código de verificação inválido.");
    }
    if (temp.codigoExpiracao && new Date() > temp.codigoExpiracao) {
      throw new BadRequestException("O código expirou.");
    }

    let instituicaoId: string | null = null;
    if (temp.instituicaoNome) {
      const instituicao = await this.usersService.getOrCreateInstituicao(temp.instituicaoNome);
      instituicaoId = instituicao?.id || null;
    }

    function gerarCodigoUnico() {
      return crypto.randomInt(10000, 99999).toString() + Date.now();
    }

    try {
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
        instituicaoId,
        emailVerificado: true,
        criadoEm: new Date(),
        atualizadoEm: new Date(),
        codigoVerificado: gerarCodigoUnico(),
        codigoExpiracao: new Date(),
      });

      delete tempRegisterStore[email];

      if (!user || !user.id) {
        throw new BadRequestException("Erro ao criar usuário. Tente novamente.");
      }

      const payload = { sub: user.id, email: user.email };
      const token = this.jwtService.sign(payload);

      return { message: "E-mail verificado e cadastro concluído.", user, token };
    } catch (error: unknown) {
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        (error as any).code === "P2002" &&
        "meta" in error &&
        (error as any).meta?.target?.includes("email")
      ) {
        throw new BadRequestException("O e-mail já está em uso.");
      }
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        (error as any).code === "P2002" &&
        "meta" in error &&
        (error as any).meta?.target?.includes("codigoVerificado")
      ) {
        throw new BadRequestException(
          "Erro interno: conflito de código de verificação. Tente novamente.",
        );
      }
      throw new BadRequestException(
        typeof error === "object" && error !== null && "message" in error
          ? (error as any).message
          : "Erro interno ao criar usuário.",
      );
    }
  }

  private async sendVerificationEmail(email: string, codigo: string) {
    const resend = new Resend(RESEND_API_KEY);
    await resend.emails.send({
      from: "noreply@thinkspace.app.br",
      to: email,
      subject: "🎉Bem-vindo ao ThinkSpace! Verifique seu e-mail",
      html: `
        <div style="font-family: Arial, sans-serif; text-align: center; color: #333;">
          <img src="https://i.imgur.com/4JBPx3E.png" alt="ThinkSpace Logo" style="hight: full; width: full; margin-bottom: 20px;" />
          <h1 style="color:rgb(146, 102, 204);"> 🎉 Bem-vindo ao ThinkSpace!</h1>
          <p style="color:#333;">Obrigado por se registrar na nossa plataforma. Estamos muito felizes em tê-lo conosco! 😊</p>
          <p style="color:#333;">Por favor, use o código abaixo para verificar seu e-mail. Ele é válido por <strong>10 minutos</strong>:</p>
          <div style="font-size: 24px; font-weight: bold; color:rgb(153, 98, 175); margin: 20px 0;">
            ${codigo}
          </div>
          <p style="color:#333;">Você tem até <strong>3 tentativas</strong> para reenviar o código. Caso não conclua a verificação após 3 reenvios, seu cadastro será <strong>deletado</strong> e será necessário refazer todo o processo.</p>
          <p style="color:#333;">Se você não se registrou, ignore este e-mail. Caso tenha dúvidas, entre em contato conosco.</p>
          <p style="margin-top: 30px; color:#333;">💡 <strong>Equipe ThinkSpace</strong></p>
          <hr style="margin: 20px 0; border: none; border-top: 1px solid #ddd;" />
          <p style="font-size: 12px; color: #777;">Este é um e-mail automático. Por favor, não responda.</p>
        </div>
      `,
    });
  }

  async sendPasswordResetCode(email: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new BadRequestException("Usuário não encontrado.");
    }
    const resetCode = Math.floor(10000 + Math.random() * 90000).toString();
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
            <img src="https://i.imgur.com/4JBPx3E.png" alt="ThinkSpace Logo" style="hight: full; width: full; margin-bottom: 20px;" />
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

    const hoje = new Date();
    const ultimoLogin = user.ultimoLogin ? new Date(user.ultimoLogin) : null;
    const mesmoDia =
      ultimoLogin &&
      ultimoLogin.getFullYear() === hoje.getFullYear() &&
      ultimoLogin.getMonth() === hoje.getMonth() &&
      ultimoLogin.getDate() === hoje.getDate();

    if (!mesmoDia) {
      await this.usersService.update(user.id, { ultimoLogin: hoje });
    }

    const { senha: _, ...userWithoutPassword } = user;
    const payload = { sub: user.id, email: user.email };
    const token = this.jwtService.sign(payload);
    return { ...userWithoutPassword, token };
  }
}
