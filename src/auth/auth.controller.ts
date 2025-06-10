import { Body, Controller, Post, UnauthorizedException, BadRequestException } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { UsersService } from "../users/users.service";

@Controller("auth")
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
  ) {}

  @Post("registrar")
  async register(@Body() body: any) {
    if (
      !body ||
      !body.primeiroNome ||
      !body.sobrenome ||
      !body.email ||
      !body.senha ||
      !body.confirmarSenha ||
      !body.dataNascimento
    ) {
      throw new BadRequestException("Dados de registro incompletos");
    }
    return this.authService.register({
      primeiroNome: body.primeiroNome,
      sobrenome: body.sobrenome,
      email: body.email,
      senha: body.senha,
      confirmarSenha: body.confirmarSenha,
      dataNascimento: body.dataNascimento,
    });
  }

  @Post("verificar-codigo")
  async verifyCode(@Body() body: { code?: string }) {
    if (!body || !body.code) {
      throw new BadRequestException("Código de verificação é obrigatório");
    }
    return this.authService.verifyCode(body.code);
  }

  @Post("esqueceu-senha")
  async forgotPassword(
    @Body() body: { email?: string; code?: string; novaSenha?: string; confirmarSenha?: string },
  ) {
    if (body.email && !body.code && !body.novaSenha) {
      return this.authService.sendPasswordResetCode(body.email);
    }
    if (body.email && body.code && !body.novaSenha) {
      return this.authService.verifyPasswordResetCode(body.email, body.code);
    }

    if (body.email && body.code && body.novaSenha && body.confirmarSenha) {
      return this.authService.resetPassword(
        body.email,
        body.code,
        body.novaSenha,
        body.confirmarSenha,
      );
    }
    throw new BadRequestException("Dados insuficientes para redefinir a senha.");
  }

  @Post("login")
  async login(@Body() body: { email?: string; senha?: string }) {
    if (!body || !body.email || !body.senha) {
      throw new UnauthorizedException("Email e senha são obrigatórios");
    }
    const user = await this.authService.validateUser(body.email, body.senha);
    if (!user) {
      throw new UnauthorizedException("Credenciais inválidas");
    }
    return { message: "Login realizado com sucesso", user };
  }

  @Post("completar-cadastro")
  async completeProfile(
    @Body()
    body: {
      email: string;
      escolaridade: string;
      objetivoNaPlataforma: string;
      areaDeInteresse: string;
      instituicaoNome: string;
    },
  ) {
    const { email, escolaridade, objetivoNaPlataforma, areaDeInteresse, instituicaoNome } = body;
    if (!email || !escolaridade || !objetivoNaPlataforma || !areaDeInteresse || !instituicaoNome) {
      throw new BadRequestException("Todos os campos obrigatórios devem ser preenchidos.");
    }
    return this.usersService.completeProfile(email, {
      escolaridade,
      objetivoNaPlataforma,
      areaDeInteresse,
      instituicaoNome,
    });
  }
}
