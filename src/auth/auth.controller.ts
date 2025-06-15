import {
  Body,
  Controller,
  Post,
  UnauthorizedException,
  BadRequestException,
  Res,
  Get,
} from "@nestjs/common";
import { AuthService } from "./auth.service";
import { UsersService } from "../users/users.service";
import { Response } from "express";
import { CookieOptions } from "express";

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
    return this.authService.registrarStep1({
      primeiroNome: body.primeiroNome,
      sobrenome: body.sobrenome,
      email: body.email,
      senha: body.senha,
      confirmarSenha: body.confirmarSenha,
      dataNascimento: body.dataNascimento,
    });
  }

  @Post("escolher-funcao")
  async escolherFuncao(@Body() body: { email: string; funcao: "ADMIN" | "ESTUDANTE" }) {
    if (!body || !body.email || !body.funcao) {
      throw new BadRequestException("Email e função são obrigatórios.");
    }
    return this.authService.registrarStep2EscolherFuncao(body.email, body.funcao);
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
    return this.authService.registrarStep3Completar(email, {
      escolaridade,
      objetivoNaPlataforma,
      areaDeInteresse,
      instituicaoNome,
    });
  }

  @Post("reenviar-codigo")
  async reenviarCodigo(@Body() body: { email: string }) {
    if (!body || !body.email) {
      throw new BadRequestException("Email é obrigatório.");
    }
    return this.authService.reenviarCodigo(body.email);
  }

  @Post("verificar-codigo")
  async verifyCode(@Body() body: { email?: string; code?: string }) {
    if (!body || !body.email || !body.code) {
      throw new BadRequestException("Email e código de verificação são obrigatórios");
    }
    return this.authService.verificarEmail(body.email, body.code);
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
  async login(@Body() body: { email?: string; senha?: string }, @Res() res: Response) {
    if (!body || !body.email || !body.senha) {
      throw new UnauthorizedException("Email e senha são obrigatórios");
    }
    const userWithToken = await this.authService.validateUser(body.email, body.senha);
    if (!userWithToken) {
      throw new UnauthorizedException("Credenciais inválidas");
    }

    const cookieOptions: CookieOptions = {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 dias
    };

    res.cookie("token", userWithToken.token, cookieOptions);

    const { token, ...userWithoutToken } = userWithToken;

    res.setHeader("Access-Control-Allow-Credentials", "true");

    return res.status(200).json({
      message: "Login realizado com sucesso",
      user: userWithoutToken,
    });
  }

  @Get("teste-cookie")
  testeCookie(@Res() res: Response) {
    res.cookie("meuteste", "valor123", {
      domain: ".thinkspace.app.br", // agora permitido!
      path: "/",
      httpOnly: true,
      secure: true, // obrigatório para sameSite: 'None'
      sameSite: "none", // precisa ser 'none' para cookies cross-site
      path: "/",
      maxAge: 60000,
    });
    res.send("cookie enviado");
  }
}
