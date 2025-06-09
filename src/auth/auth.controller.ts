import { Controller, Post, Body, UnauthorizedException, BadRequestException } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { RegisterDto } from "./dto/register.dto";

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("registrar")
  async register(@Body() body: any) {
    if (!body || !body.email || !body.password || !body.confirmPassword) {
      throw new BadRequestException("Dados de registro incompletos");
    }
    if (body.code) {
      return this.authService.verifyCode(body.code);
    }
    return this.authService.register(body as RegisterDto);
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
}
