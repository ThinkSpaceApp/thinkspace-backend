import {
  Body,
  Controller,
  Post,
  UnauthorizedException,
  BadRequestException,
  Res,
  Get,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from "@nestjs/swagger";
import { AuthService } from "./auth.service";
import { UsersService } from "../users/users.service";
import { Response } from "express";
import { CookieOptions } from "express";

@ApiTags("Autenticação")
@Controller("auth")
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
  ) {}

  @ApiOperation({ summary: "Iniciar registro de usuário" })
  @ApiResponse({ status: 201, description: "Dados iniciais recebidos." })
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        primeiroNome: { type: "string" },
        sobrenome: { type: "string" },
        email: { type: "string" },
        senha: { type: "string" },
        confirmarSenha: { type: "string" },
        dataNascimento: { type: "string" },
      },
      required: ["primeiroNome", "sobrenome", "email", "senha", "confirmarSenha", "dataNascimento"],
    },
  })
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

  @ApiOperation({ summary: "Escolher função do usuário" })
  @ApiResponse({ status: 200, description: "Função definida. Complete o cadastro." })
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        email: { type: "string" },
        funcao: { type: "string", enum: ["ADMIN", "ESTUDANTE"] },
      },
      required: ["email", "funcao"],
    },
  })
  @Post("escolher-funcao")
  async escolherFuncao(@Body() body: { email: string; funcao: "ADMIN" | "ESTUDANTE" }) {
    if (!body || !body.email || !body.funcao) {
      throw new BadRequestException("Email e função são obrigatórios.");
    }
    return this.authService.registrarStep2EscolherFuncao(body.email, body.funcao);
  }

  @ApiOperation({ summary: "Completar cadastro do usuário" })
  @ApiResponse({ status: 200, description: "Cadastro completado, código enviado." })
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        email: { type: "string" },
        escolaridade: { type: "string" },
        objetivoNaPlataforma: { type: "string" },
        areaDeInteresse: { type: "string" },
        instituicaoNome: { type: "string" },
        aceitouTermos: { type: "boolean", description: "Usuário aceitou os termos de uso" },
      },
      required: [
        "email",
        "escolaridade",
        "objetivoNaPlataforma",
        "areaDeInteresse",
        "instituicaoNome",
        "aceitouTermos",
      ],
    },
  })
  @Post("completar-cadastro")
  async completeProfile(
    @Body()
    body: {
      email: string;
      escolaridade: string;
      objetivoNaPlataforma: string;
      areaDeInteresse: string;
      instituicaoNome: string;
      aceitouTermos: boolean;
    },
  ) {
    const { email, escolaridade, objetivoNaPlataforma, areaDeInteresse, instituicaoNome, aceitouTermos } = body;
    if (!email || !escolaridade || !objetivoNaPlataforma || !areaDeInteresse || !instituicaoNome) {
      throw new BadRequestException("Todos os campos obrigatórios devem ser preenchidos.");
    }
    if (aceitouTermos !== true) {
      throw new BadRequestException("É obrigatório aceitar os termos de uso para completar o cadastro.");
    }
    return this.authService.registrarStep3Completar(email, {
      escolaridade,
      objetivoNaPlataforma,
      areaDeInteresse,
      instituicaoNome,
      aceitouTermos,
    });
  }

  @ApiOperation({ summary: "Reenviar código de verificação" })
  @ApiResponse({ status: 200, description: "Novo código enviado para o e-mail." })
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        email: { type: "string" },
      },
      required: ["email"],
    },
  })
  @Post("reenviar-codigo")
  async reenviarCodigo(@Body() body: { email: string }) {
    if (!body || !body.email) {
      throw new BadRequestException("Email é obrigatório.");
    }
    return this.authService.reenviarCodigo(body.email);
  }

  @ApiOperation({ summary: "Verificar código de verificação" })
  @ApiResponse({ status: 200, description: "E-mail verificado e cadastro concluído." })
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        email: { type: "string" },
        code: { type: "string" },
      },
      required: ["email", "code"],
    },
  })
  @Post("verificar-codigo")
  async verifyCode(@Body() body: { email?: string; code?: string }) {
    if (!body || !body.email || !body.code) {
      throw new BadRequestException("Email e código de verificação são obrigatórios");
    }
    return this.authService.verificarEmail(body.email, body.code);
  }

  @ApiOperation({ summary: "Enviar código para redefinição de senha" })
  @ApiResponse({ status: 200, description: "Código de redefinição enviado para o e-mail." })
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        email: { type: "string" },
      },
      required: ["email"],
    },
  })
  @Post("esqueceu-senha/enviar-codigo")
  async forgotPasswordEnviarCodigo(@Body() body: { email?: string }) {
    if (!body.email) {
      throw new BadRequestException("Email é obrigatório.");
    }
    return this.authService.sendPasswordResetCode(body.email);
  }

  @ApiOperation({ summary: "Reenviar código de redefinição de senha" })
  @ApiResponse({ status: 200, description: "Código de redefinição reenviado para o e-mail." })
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        email: { type: "string" },
      },
      required: ["email"],
    },
  })
  @Post("esqueceu-senha/reenviar-codigo")
  async forgotPasswordReenviarCodigo(@Body() body: { email?: string }) {
    if (!body.email) {
      throw new BadRequestException("Email é obrigatório.");
    }
    return this.authService.sendPasswordResetCode(body.email);
  }

  @ApiOperation({ summary: "Verificar código de redefinição de senha" })
  @ApiResponse({ status: 200, description: "Código válido. Você pode redefinir sua senha." })
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        email: { type: "string" },
        code: { type: "string" },
      },
      required: ["email", "code"],
    },
  })
  @Post("esqueceu-senha/verificar-codigo")
  async forgotPasswordVerificarCodigo(@Body() body: { email?: string; code?: string }) {
    if (!body.email || !body.code) {
      throw new BadRequestException("Email e código são obrigatórios.");
    }
    return this.authService.verifyPasswordResetCode(body.email, body.code);
  }

  @ApiOperation({ summary: "Redefinir senha" })
  @ApiResponse({ status: 200, description: "Senha redefinida com sucesso." })
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        email: { type: "string" },
        code: { type: "string" },
        novaSenha: { type: "string" },
        confirmarSenha: { type: "string" },
      },
      required: ["email", "code", "novaSenha", "confirmarSenha"],
    },
  })
  @Post("esqueceu-senha/redefinir")
  async forgotPasswordRedefinir(
    @Body() body: { email?: string; code?: string; novaSenha?: string; confirmarSenha?: string },
  ) {
    if (!body.email || !body.code || !body.novaSenha || !body.confirmarSenha) {
      throw new BadRequestException("Email, código, nova senha e confirmação são obrigatórios.");
    }
    return this.authService.resetPassword(
      body.email,
      body.code,
      body.novaSenha,
      body.confirmarSenha,
    );
  }

  @ApiOperation({ summary: "Login do usuário" })
  @ApiResponse({ status: 200, description: "Login realizado com sucesso." })
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        email: { type: "string" },
        senha: { type: "string" },
      },
      required: ["email", "senha"],
    },
  })
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
      ...(process.env.NODE_ENV === "production"
        ? {
            domain: ".thinkspace.app.br",
            secure: true,
            sameSite: "none",
          }
        : {
            secure: false,
            sameSite: "lax",
          }),
      path: "/",
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    };

    res.cookie("token", userWithToken.token, cookieOptions);

    const { token, ...userWithoutToken } = userWithToken;

    res.setHeader("Access-Control-Allow-Credentials", "true");

    return res.status(200).json({
      message: "Login realizado com sucesso",
      user: userWithoutToken,
      token,
    });
  }

  @ApiOperation({ summary: "Logout do usuário" })
  @ApiResponse({ status: 200, description: "Logout realizado com sucesso." })
  @Post("logout")
  logout(@Res() res: Response) {
    res.clearCookie("token", {
      domain: ".thinkspace.app.br",
      path: "/",
      httpOnly: true,
      secure: true,
      sameSite: "none",
    });
    return res.status(200).json({ message: "Logout realizado com sucesso" });
  }
}
