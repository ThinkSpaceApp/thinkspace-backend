import { Controller, Patch, Body, Req, UseGuards, Delete, Post } from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation, ApiBody, ApiResponse } from "@nestjs/swagger";
import { AuthGuard } from "@nestjs/passport";
import { Request } from "express";
import { ConfiguracoesService } from "./configuracoes.service";

@ApiTags("Configurações")
@ApiBearerAuth()
@UseGuards(AuthGuard("jwt"))
@Controller("configuracoes")
export class ConfiguracoesController {
  constructor(private readonly configuracoesService: ConfiguracoesService) {}
  @Patch("primeiro-nome")
  @ApiOperation({ summary: "Alterar primeiro nome do usuário" })
  @ApiBody({
    schema: {
      type: "object",
      properties: { primeiroNome: { type: "string" } },
      required: ["primeiroNome"],
    },
  })
  @ApiResponse({ status: 200, description: "Primeiro nome alterado com sucesso." })
  async alterarPrimeiroNome(@Req() req: Request, @Body("primeiroNome") primeiroNome: string) {
    if (!req.user || !("userId" in req.user)) {
      throw new Error("Usuário não autenticado ou userId ausente.");
    }
    return this.configuracoesService.alterarPrimeiroNome((req.user as any).userId, primeiroNome);
  }
  @Patch("sobrenome")
  @ApiOperation({ summary: "Alterar sobrenome do usuário" })
  @ApiBody({
    schema: {
      type: "object",
      properties: { sobrenome: { type: "string" } },
      required: ["sobrenome"],
    },
  })
  @ApiResponse({ status: 200, description: "Sobrenome alterado com sucesso." })
  async alterarSobrenome(@Req() req: Request, @Body("sobrenome") sobrenome: string) {
    if (!req.user || !("userId" in req.user)) {
      throw new Error("Usuário não autenticado ou userId ausente.");
    }
    return this.configuracoesService.alterarSobrenome((req.user as any).userId, sobrenome);
  }
  @Patch("data-nascimento")
  @ApiOperation({ summary: "Alterar data de nascimento do usuário" })
  @ApiBody({
    schema: {
      type: "object",
      properties: { dataNascimento: { type: "string", format: "date" } },
      required: ["dataNascimento"],
    },
  })
  @ApiResponse({ status: 200, description: "Data de nascimento alterada com sucesso." })
  async alterarDataNascimento(@Req() req: Request, @Body("dataNascimento") dataNascimento: string) {
    if (!req.user || !("userId" in req.user)) {
      throw new Error("Usuário não autenticado ou userId ausente.");
    }
    return this.configuracoesService.alterarDataNascimento(
      (req.user as any).userId,
      dataNascimento,
    );
  }

  @Patch("instituicao")
  @ApiOperation({ summary: "Alterar instituição do usuário" })
  @ApiBody({
    schema: {
      type: "object",
      properties: { instituicao: { type: "string" } },
      required: ["instituicao"],
    },
  })
  @ApiResponse({ status: 200, description: "Instituição alterada com sucesso." })
  async alterarInstituicao(@Req() req: Request, @Body("instituicao") instituicao: string) {
    if (!req.user || !("userId" in req.user)) {
      throw new Error("Usuário não autenticado ou userId ausente.");
    }
    return this.configuracoesService.alterarInstituicao((req.user as any).userId, instituicao);
  }
  @Patch("nivel-escolaridade")
  @ApiOperation({ summary: "Alterar nível de escolaridade do usuário" })
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        nivelEscolaridade: {
          type: "string",
          enum: [
            "FUNDAMENTAL_INCOMPLETO",
            "FUNDAMENTAL_COMPLETO",
            "MEDIO_INCOMPLETO",
            "MEDIO_COMPLETO",
            "SUPERIOR_INCOMPLETO",
            "SUPERIOR_COMPLETO",
            "POS_GRADUACAO",
            "MESTRADO",
            "DOUTORADO",
            "PREFIRO_NAO_INFORMAR",
          ],
        },
      },
      required: ["nivelEscolaridade"],
    },
  })
  @ApiResponse({ status: 200, description: "Nível de escolaridade alterado com sucesso." })
  async alterarNivelEscolaridade(
    @Req() req: Request,
    @Body("nivelEscolaridade") nivelEscolaridade: string,
  ) {
    if (!req.user || !("userId" in req.user)) {
      throw new Error("Usuário não autenticado ou userId ausente.");
    }
    return this.configuracoesService.alterarNivelEscolaridade(
      (req.user as any).userId,
      nivelEscolaridade,
    );
  }

  @Patch("suspender-conta")
  @ApiOperation({ summary: "Suspender a conta do usuário" })
  @ApiBody({ schema: { type: "object", properties: { senhaAtual: { type: "string", minLength: 6 } }, required: ["senhaAtual"] } })
  @ApiResponse({ status: 200, description: "Conta suspensa com sucesso." })
  async suspenderConta(@Req() req: Request, @Body('senhaAtual') senhaAtual: string) {
    if (!req.user || !("userId" in req.user)) {
      throw new Error("Usuário não autenticado ou userId ausente.");
    }
    const userId = (req.user as any).userId;
    const usuario = await this.configuracoesService.getUsuarioById(userId);
    if (!usuario) {
      throw new Error("Usuário não encontrado.");
    }
    const bcrypt = await import('bcrypt');
    const senhaValida = await bcrypt.compare(senhaAtual, usuario.senha);
    if (!senhaValida) {
      throw new Error("Senha atual incorreta.");
    }
    return this.configuracoesService.suspenderConta(userId);
  }

  @Delete("excluir-conta")
  @ApiOperation({ summary: "Excluir a conta do usuário" })
  @ApiBody({ schema: { type: "object", properties: { senhaAtual: { type: "string", minLength: 6 } }, required: ["senhaAtual"] } })
  @ApiResponse({ status: 200, description: "Conta excluída com sucesso." })
  async excluirConta(@Req() req: Request, @Body('senhaAtual') senhaAtual: string) {
    if (!req.user || !("userId" in req.user)) {
      throw new Error("Usuário não autenticado ou userId ausente.");
    }
    const userId = (req.user as any).userId;
    const prisma = this.configuracoesService['prisma'];
    const salasModeradas = await prisma.salaEstudo.findMany({ where: { moderadorId: userId } });
    if (salasModeradas.length > 0) {
      for (const sala of salasModeradas) {
        await prisma.membroSala.deleteMany({ where: { salaId: sala.id } });
        await prisma.atividade.deleteMany({ where: { salaId: sala.id } });
        await prisma.salaEstudoMaterial.deleteMany({ where: { salaId: sala.id } });
        // await prisma.topicoComunidade.deleteMany({ where: { salaId: sala.id } }); 
        await prisma.calendario.deleteMany({ where: { salaId: sala.id } });
        await prisma.salaEstudo.delete({ where: { id: sala.id } });
      }
    }
    const usuario = await this.configuracoesService.getUsuarioById(userId);
    if (!usuario) {
      throw new Error("Usuário não encontrado.");
    }
    const bcrypt = await import('bcrypt');
    const senhaValida = await bcrypt.compare(senhaAtual, usuario.senha);
    if (!senhaValida) {
      throw new Error("Senha atual incorreta.");
    }
    await prisma.membroSala.deleteMany({ where: { usuarioId: userId } });
    await prisma.materialEstudo.deleteMany({ where: { autorId: userId } });
    const materiasDoUsuario = await prisma.materia.findMany({ where: { usuarioId: userId } });
    for (const materia of materiasDoUsuario) {
      await prisma.materialEstudo.deleteMany({ where: { materiaId: materia.id } });
    }
    await prisma.materia.deleteMany({ where: { usuarioId: userId } });
    // await prisma.postagemComunidade.deleteMany({ where: { autorId: userId } }); 
    await prisma.comentario.deleteMany({ where: { autorId: userId } });
    // await prisma.postagemSalva.deleteMany({ where: { usuarioId: userId } });
    await prisma.denuncia.deleteMany({ where: { denuncianteId: userId } });
    await prisma.revisao.deleteMany({ where: { usuarioId: userId } });
    await prisma.calendario.deleteMany({ where: { usuarioId: userId } });
    await prisma.perfilUsuario.deleteMany({ where: { usuarioId: userId } });
    await prisma.experienciaUsuario.deleteMany({ where: { usuarioId: userId } });
    await prisma.atividadeUsuario.deleteMany({ where: { usuarioId: userId } });
    await prisma.notificacao.deleteMany({ where: { usuarioId: userId } });
    await prisma.metricasUsuario.deleteMany({ where: { usuarioId: userId } });
    await prisma.verificacaoEmail.deleteMany({ where: { usuarioId: userId } });
    await prisma.chatMensagem.deleteMany({ where: { autorId: userId } });
    await this.configuracoesService.excluirConta(userId);
    return {
      message: "Conta excluída com sucesso. Faça logout ou redirecione o usuário.",
      status: 200
    };
  }

  @Post('email/solicitar')
  @ApiOperation({ summary: 'Solicitar troca de email (passo 1)' })
  @ApiBody({ schema: { type: 'object', properties: { email: { type: 'string', format: 'email' } }, required: ['email'] } })
  @ApiResponse({ status: 200, description: 'Email para troca enviado com sucesso.' })
  async solicitarTrocaEmail(@Req() req: Request, @Body('email') email: string) {
    if (!req.user || !('userId' in req.user)) {
      throw new Error('Usuário não autenticado ou userId ausente.');
    }
    return this.configuracoesService.solicitarTrocaEmail((req.user as any).userId, email);
  }

  @Post('email/enviar-codigo')
  @ApiOperation({ summary: 'Enviar código de verificação para troca de email (passo 2)' })
  @ApiResponse({ status: 200, description: 'Código de verificação enviado para o email.' })
  async enviarCodigoTrocaEmail(@Req() req: Request) {
    if (!req.user || !('userId' in req.user)) {
      throw new Error('Usuário não autenticado ou userId ausente.');
    }
    return this.configuracoesService.enviarCodigoTrocaEmail((req.user as any).userId);
  }

  @Post('email/verificar-codigo')
  @ApiOperation({ summary: 'Verificar código de troca de email' })
  @ApiBody({ schema: { type: 'object', properties: { codigo: { type: 'string' } }, required: ['codigo'] } })
  @ApiResponse({ status: 200, description: 'Código verificado com sucesso.' })
  async verificarCodigoTrocaEmail(@Req() req: Request, @Body('codigo') codigo: string) {
    if (!req.user || !('userId' in req.user)) {
      throw new Error('Usuário não autenticado ou userId ausente.');
    }
    return this.configuracoesService.verificarCodigoTrocaEmail((req.user as any).userId, codigo);
  }

  @Patch('email/confirmar')
  @ApiOperation({ summary: 'Confirmar troca de email (passo 3)' })
  @ApiBody({ schema: { type: 'object', properties: { novoEmail: { type: 'string', format: 'email' }, codigo: { type: 'string' } }, required: ['novoEmail', 'codigo'] } })
  @ApiResponse({ status: 200, description: 'Email alterado com sucesso.' })
  async confirmarTrocaEmail(@Req() req: Request, @Body('novoEmail') novoEmail: string, @Body('codigo') codigo: string) {
    if (!req.user || !('userId' in req.user)) {
      throw new Error('Usuário não autenticado ou userId ausente.');
    }
    return this.configuracoesService.confirmarTrocaEmail((req.user as any).userId, novoEmail, codigo);
  }

  @Post('senha/solicitar')
  @ApiOperation({ summary: 'Solicitar troca de senha (passo 1)' })
  @ApiBody({ schema: { type: 'object', properties: { email: { type: 'string', format: 'email' } }, required: ['email'] } })
  @ApiResponse({ status: 200, description: 'Solicitação de troca de senha registrada.' })
  async solicitarTrocaSenha(@Req() req: Request, @Body('email') email: string) {
    if (!req.user || !('userId' in req.user)) {
      throw new Error('Usuário não autenticado ou userId ausente.');
    }
    return this.configuracoesService.solicitarTrocaSenha((req.user as any).userId, email);
  }

  @Post('senha/enviar-codigo')
  @ApiOperation({ summary: 'Enviar código de verificação para troca de senha (passo 2)' })
  @ApiResponse({ status: 200, description: 'Código de verificação enviado para o email.' })
  async enviarCodigoTrocaSenha(@Req() req: Request) {
    if (!req.user || !('userId' in req.user)) {
      throw new Error('Usuário não autenticado ou userId ausente.');
    }
    return this.configuracoesService.enviarCodigoTrocaSenha((req.user as any).userId);
  }

  @Post('senha/verificar-codigo')
  @ApiOperation({ summary: 'Verificar código de troca de senha' })
  @ApiBody({ schema: { type: 'object', properties: { codigo: { type: 'string' } }, required: ['codigo'] } })
  @ApiResponse({ status: 200, description: 'Código verificado com sucesso.' })
  async verificarCodigoTrocaSenha(@Req() req: Request, @Body('codigo') codigo: string) {
    if (!req.user || !('userId' in req.user)) {
      throw new Error('Usuário não autenticado ou userId ausente.');
    }
    return this.configuracoesService.verificarCodigoTrocaSenha((req.user as any).userId, codigo);
  }

  @Patch('senha/confirmar')
  @ApiOperation({ summary: 'Confirmar troca de senha (passo 3)' })
  @ApiBody({ schema: { type: 'object', properties: { novaSenha: { type: 'string', minLength: 6 }, confirmarSenha: { type: 'string', minLength: 6 }, codigo: { type: 'string' } }, required: ['novaSenha', 'confirmarSenha', 'codigo'] } })
  @ApiResponse({ status: 200, description: 'Senha alterada com sucesso.' })
  async confirmarTrocaSenha(
    @Req() req: Request,
    @Body('novaSenha') novaSenha: string,
    @Body('confirmarSenha') confirmarSenha: string,
    @Body('codigo') codigo: string
  ) {
    if (!req.user || !('userId' in req.user)) {
      throw new Error('Usuário não autenticado ou userId ausente.');
    }
    return this.configuracoesService.confirmarTrocaSenha((req.user as any).userId, novaSenha, confirmarSenha, codigo);
  }
}

