import { Controller, Get, Res, HttpStatus, Post, Put, Param, Body } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { Response } from "express";
import { salaEstudoService } from "./salaEstudo.service";
import { PrismaService } from "../prisma/prisma.service";

@ApiTags("Sala de Estudo")
@Controller("sala-estudo")
export class salaEstudoController {
  constructor(
    private readonly salaEstudoService: salaEstudoService,
    private readonly prisma: PrismaService,
  ) {}

  @ApiOperation({ summary: "Atualizar todas as informações de uma sala de estudo pelo id" })
  @ApiResponse({ status: 200, description: "Sala de estudo atualizada com sucesso." })
  @ApiResponse({ status: 404, description: "Sala de estudo não encontrada." })
  @ApiResponse({ status: 500, description: "Erro ao atualizar sala de estudo." })
  @Put(":id")
  async updateSalaEstudoById(@Param("id") id: string, @Body() body: any, @Res() res: Response) {
    try {
      const sala = await this.salaEstudoService.updateSalaEstudoById(id, body);
      return res.status(HttpStatus.OK).json({
        message: "Sala de estudo atualizada com sucesso.",
        sala,
      });
    } catch (error) {
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        (error as any).code === "P2025"
      ) {
        return res.status(HttpStatus.NOT_FOUND).json({
          error: "Sala de estudo não encontrada.",
        });
      }
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        error: "Erro ao atualizar sala de estudo.",
        details: error,
      });
    }
  }

  @ApiOperation({ summary: 'Criar sala padrão "thinkspace"' })
  @ApiResponse({ status: 201, description: "Sala padrão criada com sucesso." })
  @ApiResponse({ status: 200, description: "Sala padrão já existe." })
  @ApiResponse({ status: 500, description: "Erro ao criar sala padrão." })
  @Post("create-default-room")
  async createDefaultRoom(@Res() res: Response) {
    try {
      const result = await this.salaEstudoService.ensureDefaultRoom();
      if (result.topico) {
        return res.status(HttpStatus.CREATED).json({
          message: "Sala padrão criada com sucesso.",
          salaId: result.sala.id,
          topicoId: result.topico.id,
        });
      } else {
        return res.status(HttpStatus.OK).json({
          message: "Sala padrão já existe.",
          salaId: result.sala.id,
        });
      }
    } catch (error) {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        error: "Erro ao criar sala padrão.",
        details: error,
      });
    }
  }

  @ApiOperation({ summary: "Garantir sala padrão e adicionar todos os usuários nela" })
  @ApiResponse({ status: 200, description: "Defaults ensured." })
  @ApiResponse({ status: 500, description: "Erro ao garantir dados padrão." })
  @Get("salaEstudo-defaults")
  async salaEstudoDefaults(@Res() res: Response) {
    try {
      await this.salaEstudoService.ensureDefaultRoom();
      const result = await this.salaEstudoService.ensureAllUsersInDefaultRoom();
      return res.status(HttpStatus.OK).json({
        message: "Defaults ensured.",
        addedUsers: result.addedUsers,
        totalAdded: result.addedUsers.length,
      });
    } catch (error) {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        error: "Erro ao garantir dados padrão.",
        details: error,
      });
    }
  }

  @ApiOperation({ summary: "Obter status da sala padrão" })
  @ApiResponse({ status: 200, description: "Status da sala padrão retornado com sucesso." })
  @ApiResponse({ status: 404, description: "Sala padrão não encontrada." })
  @ApiResponse({ status: 500, description: "Erro ao obter status da sala padrão." })
  @Get("status")
  async getStatus(@Res() res: Response) {
    try {
      const defaultRoom = await this.prisma.salaEstudo.findFirst({
        where: { nome: "thinkspace" },
        include: {
          membros: {
            include: {
              usuario: {
                select: {
                  id: true,
                  email: true,
                  primeiroNome: true,
                  sobrenome: true,
                  foto: true,
                  nomeCompleto: true,
                },
              },
            },
          },
          TopicoComunidade: true,
        },
      });
      if (!defaultRoom) {
        return res.status(HttpStatus.NOT_FOUND).json({
          message: "Sala padrão não encontrada",
        });
      }
      const avataresUltimosUsuarios = Array.isArray(defaultRoom.membros)
        ? defaultRoom.membros.slice(-4).map((membro) => {
            if (
              membro.usuario.foto &&
              !membro.usuario.foto.includes("ui-avatars.com/api/?name=User")
            ) {
              return membro.usuario.foto;
            }
            let iniciais = "";
            const nome = membro.usuario.primeiroNome?.trim() || "";
            const sobrenome = membro.usuario.sobrenome?.trim() || "";
            if (nome || sobrenome) {
              iniciais = `${nome.charAt(0)}${sobrenome.charAt(0)}`.toUpperCase();
            } else if (membro.usuario.nomeCompleto) {
              const partes = membro.usuario.nomeCompleto.trim().split(" ");
              iniciais =
                partes.length > 1
                  ? `${partes[0][0]}${partes[1][0]}`.toUpperCase()
                  : `${partes[0][0]}`.toUpperCase();
            } else if (membro.usuario.email) {
              iniciais = membro.usuario.email.charAt(0).toUpperCase();
            } else {
              iniciais = "U";
            }
            return `https://ui-avatars.com/api/?name=${encodeURIComponent(iniciais)}&background=8e44ad&color=fff`;
          })
        : [];
      return res.status(HttpStatus.OK).json({
        sala: {
          id: defaultRoom.id,
          nome: defaultRoom.nome,
          descricao: defaultRoom.descricao,
          topicos: defaultRoom.topicos,
          banner: defaultRoom.banner,
          moderadorId: defaultRoom.moderadorId,
          totalMembros: Array.isArray(defaultRoom.membros) ? defaultRoom.membros.length : 0,
          topicosComunidade: Array.isArray(defaultRoom.TopicoComunidade)
            ? defaultRoom.TopicoComunidade.length
            : 0,
          avataresUltimosUsuarios,
        },
        membros: Array.isArray(defaultRoom.membros)
          ? defaultRoom.membros.map((membro) => ({
              usuarioId: membro.usuarioId,
              funcao: membro.funcao,
              ingressouEm: membro.ingressouEm,
              usuario: membro.usuario,
            }))
          : [],
      });
    } catch (error) {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        error: "Erro ao obter status da sala padrão",
        details: error,
      });
    }
  }
}
