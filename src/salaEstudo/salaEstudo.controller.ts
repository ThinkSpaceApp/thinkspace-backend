import { Controller, Get, Res, HttpStatus, Post, Put, Param, Body } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { Response } from "express";
import { salaEstudoService } from "./salaEstudo.service";
import { PrismaService } from "../prisma/prisma.service";

export class CriarSalaEstudoDto {
  nome!: string;
  descricao?: string;
  tipo!: 'PUBLICA' | 'PRIVADA';
  tags!: string[];
  autorId!: string;
}
  export class CriarPostDto {
  salaId!: string;
  autorId!: string;
  titulo!: string;
  conteudo!: string;
}

@ApiTags("Sala de Estudo")
@Controller("sala-estudo")
export class salaEstudoController {
  constructor(
    private readonly salaEstudoService: salaEstudoService,
    private readonly prisma: PrismaService,
  ) {}

  @ApiOperation({ summary: "Criar uma nova sala de estudo", description: "O moderador será sempre o usuário criador (autorId). Não é necessário informar moderadorId." })
  @ApiResponse({ status: 201, description: "Sala de estudo criada com sucesso. O moderador é definido automaticamente." })
  @Post()
  async criarSalaEstudo(@Body() body: CriarSalaEstudoDto, @Res() res: Response) {
    try {
      const data: any = {
        nome: body.nome,
        descricao: body.descricao,
        topicos: body.tags,
        banner: null,
        moderadorId: body.autorId, 
        criadoEm: new Date(),
        assunto: null,
      };
      if (body.tipo) {
        data.tipo = body.tipo;
      }
      const sala = await this.prisma.salaEstudo.create({ data });
      return res.status(HttpStatus.CREATED).json(sala);
    } catch (error) {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ error: "Erro ao criar sala de estudo.", details: error });
    }
  }

  // @ApiOperation({ summary: "Atualizar todas as informações de uma sala de estudo pelo id" })
  // @ApiResponse({ status: 200, description: "Sala de estudo atualizada com sucesso." })
  // @ApiResponse({ status: 404, description: "Sala de estudo não encontrada." })
  // @ApiResponse({ status: 500, description: "Erro ao atualizar sala de estudo." })
  // @Put(":id")
  // async updateSalaEstudoById(@Param("id") id: string, @Body() body: any, @Res() res: Response) {
  //   try {
  //     const sala = await this.salaEstudoService.updateSalaEstudoById(id, body);
  //     return res.status(HttpStatus.OK).json({
  //       message: "Sala de estudo atualizada com sucesso.",
  //       sala,
  //     });
  //   } catch (error) {
  //     if (
  //       typeof error === "object" &&
  //       error !== null &&
  //       "code" in error &&
  //       (error as any).code === "P2025"
  //     ) {
  //       return res.status(HttpStatus.NOT_FOUND).json({
  //         error: "Sala de estudo não encontrada.",
  //       });
  //     }
  //     return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
  //       error: "Erro ao atualizar sala de estudo.",
  //       details: error,
  //     });
  //   }
  // }

  // @ApiOperation({ summary: 'Criar sala padrão "thinkspace"' })
  // @ApiResponse({ status: 201, description: "Sala padrão criada com sucesso." })
  // @ApiResponse({ status: 200, description: "Sala padrão já existe." })
  // @ApiResponse({ status: 500, description: "Erro ao criar sala padrão." })
  // @Post("create-default-room")
  // async createDefaultRoom(@Res() res: Response) {
  //   try {
  //     const result = await this.salaEstudoService.ensureDefaultRoom();
  //     if (result.topico) {
  //       return res.status(HttpStatus.CREATED).json({
  //         message: "Sala padrão criada com sucesso.",
  //         salaId: result.sala.id,
  //         topicoId: result.topico.id,
  //       });
  //     } else {
  //       return res.status(HttpStatus.OK).json({
  //         message: "Sala padrão já existe.",
  //         salaId: result.sala.id,
  //       });
  //     }
  //   } catch (error) {
  //     return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
  //       error: "Erro ao criar sala padrão.",
  //       details: error,
  //     });
  //   }
  // }

  // @ApiOperation({ summary: "Garantir sala padrão e adicionar todos os usuários nela" })
  // @ApiResponse({ status: 200, description: "Defaults ensured." })
  // @ApiResponse({ status: 500, description: "Erro ao garantir dados padrão." })
  // @Get("salaEstudo-defaults")
  // async salaEstudoDefaults(@Res() res: Response) {
  //   try {
  //     await this.salaEstudoService.ensureDefaultRoom();
  //     const result = await this.salaEstudoService.ensureAllUsersInDefaultRoom();
  //     return res.status(HttpStatus.OK).json({
  //       message: "Defaults ensured.",
  //       addedUsers: result?.addedUsers ?? [],
  //       totalAdded: result?.addedUsers ? result.addedUsers.length : 0,
  //     });
  //   } catch (error) {
  //     return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
  //       error: "Erro ao garantir dados padrão.",
  //       details: error,
  //     });
  //   }
  // }

  // @ApiOperation({ summary: "Obter status da sala padrão" })
  // @ApiResponse({ status: 200, description: "Status da sala padrão retornado com sucesso." })
  // @ApiResponse({ status: 404, description: "Sala padrão não encontrada." })
  // @ApiResponse({ status: 500, description: "Erro ao obter status da sala padrão." })
  // @Get("status")
  // async getStatus(@Res() res: Response) {
  //   try {
  //     const defaultRoom = await this.prisma.salaEstudo.findFirst({
  //       where: { nome: "thinkspace" },
  //       include: {
  //         membros: {
  //           include: {
  //             usuario: {
  //               select: {
  //                 id: true,
  //                 email: true,
  //                 primeiroNome: true,
  //                 sobrenome: true,
  //                 foto: true,
  //                 nomeCompleto: true,
  //               },
  //             },
  //           },
  //         },
  //         TopicoComunidade: true,
  //       },
  //     });
  //     if (!defaultRoom) {
  //       return res.status(HttpStatus.NOT_FOUND).json({
  //         message: "Sala padrão não encontrada",
  //       });
  //     }
  //     const avataresUltimosUsuarios = Array.isArray(defaultRoom.membros)
  //       ? defaultRoom.membros.slice(-4).map((membro) => {
  //           if (
  //             membro.usuario.foto &&
  //             !membro.usuario.foto.includes("ui-avatars.com/api/?name=User")
  //           ) {
  //             return membro.usuario.foto;
  //           }
  //           let iniciais = "";
  //           const nome = membro.usuario.primeiroNome?.trim() || "";
  //           const sobrenome = membro.usuario.sobrenome?.trim() || "";
  //           if (nome || sobrenome) {
  //             iniciais = `${nome.charAt(0)}${sobrenome.charAt(0)}`.toUpperCase();
  //           } else if (membro.usuario.nomeCompleto) {
  //             const partes = membro.usuario.nomeCompleto.trim().split(" ");
  //             iniciais =
  //               partes.length > 1
  //                 ? `${partes[0][0]}${partes[1][0]}`.toUpperCase()
  //                 : `${partes[0][0]}`.toUpperCase();
  //           } else if (membro.usuario.email) {
  //             iniciais = membro.usuario.email.charAt(0).toUpperCase();
  //           } else {
  //             iniciais = "U";
  //           }
  //           return `https://ui-avatars.com/api/?name=${encodeURIComponent(iniciais)}&background=8e44ad&color=fff`;
  //         })
  //       : [];
  //     return res.status(HttpStatus.OK).json({
  //       sala: {
  //         id: defaultRoom.id,
  //         nome: defaultRoom.nome,
  //         descricao: defaultRoom.descricao,
  //         topicos: defaultRoom.topicos,
  //         banner: defaultRoom.banner,
  //         moderadorId: defaultRoom.moderadorId,
  //         totalMembros: Array.isArray(defaultRoom.membros) ? defaultRoom.membros.length : 0,
  //         topicosComunidade: Array.isArray(defaultRoom.TopicoComunidade)
  //           ? defaultRoom.TopicoComunidade.length
  //           : 0,
  //         avataresUltimosUsuarios,
  //       },
  //       membros: Array.isArray(defaultRoom.membros)
  //         ? defaultRoom.membros.map((membro) => ({
  //             usuarioId: membro.usuarioId,
  //             funcao: membro.funcao,
  //             ingressouEm: membro.ingressouEm,
  //             usuario: membro.usuario,
  //           }))
  //         : [],
  //     });
  //   } catch (error) {
  //     return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
  //       error: "Erro ao obter status da sala padrão",
  //       details: error,
  //     });
  //   }
  // }

  @ApiOperation({ summary: "Listar todas as salas de estudo" })
  @ApiResponse({ status: 200, description: "Lista de salas de estudo." })
  @Get()
  async getAllSalasEstudo(@Res() res: Response) {
    try {
      const salas = await this.prisma.salaEstudo.findMany();
      return res.status(HttpStatus.OK).json(salas);
    } catch (error) {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ error: "Erro ao buscar salas.", details: error });
    }
  }

  @ApiOperation({ summary: "Obter sala de estudo por id" })
  @ApiResponse({ status: 200, description: "Sala de estudo encontrada." })
  @ApiResponse({ status: 404, description: "Sala de estudo não encontrada." })
  @Get(":id")
  async getSalaEstudoById(@Param("id") id: string, @Res() res: Response) {
    try {
      const sala = await this.prisma.salaEstudo.findUnique({ where: { id } });
      if (!sala) {
        return res.status(HttpStatus.NOT_FOUND).json({ error: "Sala de estudo não encontrada." });
      }
      return res.status(HttpStatus.OK).json(sala);
    } catch (error) {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ error: "Erro ao buscar sala.", details: error });
    }
  }

  @ApiOperation({ summary: "Listar denúncias de um post" })
  @ApiResponse({ status: 200, description: "Lista de denúncias do post." })
  @Get("post/:postId/denuncias")
  async getDenunciasByPost(@Param("postId") postId: string, @Res() res: Response) {
    try {
  const denuncias = await this.prisma.denuncia.findMany({ where: { postId: postId } });
      return res.status(HttpStatus.OK).json(denuncias);
    } catch (error) {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ error: "Erro ao buscar denúncias.", details: error });
    }
  }

  @ApiOperation({ summary: "Listar comentários de um post" })
  @ApiResponse({ status: 200, description: "Lista de comentários do post." })
  @Get("post/:postId/comentarios")
  async getComentariosByPost(@Param("postId") postId: string, @Res() res: Response) {
    try {
  const denunciasCount = await this.prisma.denuncia.count({ where: { postId: postId } });
      if (denunciasCount >= 5) {
        return res.status(HttpStatus.OK).json({ status: "CONTEÚDO EM ANÁLISE E PODE SER OFENSIVO", comentarios: [] });
      }
  const comentarios = await this.prisma.comentario.findMany({ where: { postId: postId } });
      return res.status(HttpStatus.OK).json(comentarios);
    } catch (error) {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ error: "Erro ao buscar comentários.", details: error });
    }
  }

  @ApiOperation({ summary: "Obter número de curtidas de um post" })
  @ApiResponse({ status: 200, description: "Número de curtidas do post." })
  @Get("post/:postId/curtidas")
  async getCurtidasByPost(@Param("postId") postId: string, @Res() res: Response) {
    try {
  const post = await this.prisma.post.findUnique({ where: { id: postId } });
      if (!post) return res.status(HttpStatus.NOT_FOUND).json({ error: "Post não encontrado." });
      return res.status(HttpStatus.OK).json({ curtidas: post.curtidas });
    } catch (error) {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ error: "Erro ao buscar curtidas.", details: error });
    }
  }


  @ApiOperation({ summary: "Obter número de salvamentos de um post" })
  @ApiResponse({ status: 200, description: "Número de salvamentos do post." })
  @Get("post/:postId/salvamentos")
  async getSalvamentosByPost(@Param("postId") postId: string, @Res() res: Response) {
    try {
      const count = await this.prisma.postSalvo.count({ where: { postId } });
      return res.status(HttpStatus.OK).json({ salvamentos: count });
    } catch (error) {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ error: "Erro ao buscar salvamentos.", details: error });
    }
  }

  @ApiOperation({ summary: "Salvar um post" })
  @ApiResponse({ status: 201, description: "Post salvo com sucesso." })
  @Post("post/:postId/salvar/:usuarioId")
  async salvarPost(@Param("postId") postId: string, @Param("usuarioId") usuarioId: string, @Res() res: Response) {
    try {
      await this.prisma.postSalvo.create({ data: { postId, usuarioId } });
      return res.status(HttpStatus.CREATED).json({ message: "Post salvo com sucesso." });
    } catch (error) {
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        (error as any).code === "P2002"
      ) {
        return res.status(HttpStatus.OK).json({ message: "Post já estava salvo." });
      }
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ error: "Erro ao salvar post.", details: error });
    }
  }

  @ApiOperation({ summary: "Remover salvamento de um post" })
  @ApiResponse({ status: 200, description: "Salvamento removido com sucesso." })
  @Post("post/:postId/desfazer-salvar/:usuarioId")
  async desfazerSalvarPost(@Param("postId") postId: string, @Param("usuarioId") usuarioId: string, @Res() res: Response) {
    try {
      await this.prisma.postSalvo.delete({ where: { usuarioId_postId: { usuarioId, postId } } });
      return res.status(HttpStatus.OK).json({ message: "Salvamento removido com sucesso." });
    } catch (error) {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ error: "Erro ao remover salvamento.", details: error });
    }
  }
  @ApiOperation({ summary: "Listar todos os posts de uma sala de estudo" })
  @ApiResponse({ status: 200, description: "Lista de posts da sala." })
  @Get(":salaId/posts")
  async getPostsBySala(@Param("salaId") salaId: string, @Res() res: Response) {
    try {
      const posts = await this.prisma.post.findMany({ where: { salaId } });
      const postsComStatus = await Promise.all(posts.map(async (post: any) => {
        const denunciasCount = await this.prisma.denuncia.count({ where: { postId: post.id } });
        if (denunciasCount >= 5) {
          return {
            ...post,
            conteudo: undefined,
            status: "CONTEÚDO EM ANÁLISE E PODE SER OFENSIVO"
          };
        }
        return post;
      }));
      return res.status(HttpStatus.OK).json(postsComStatus);
    } catch (error) {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ error: "Erro ao buscar posts.", details: error });
    }
  }
  @ApiOperation({ summary: "Obter últimas salas de estudo acessadas pelo usuário" })
  @ApiResponse({ status: 200, description: "Lista das últimas salas acessadas." })
  @Get('usuario/:usuarioId/salas-recentes')
  async getUltimasSalasAcessadas(@Param('usuarioId') usuarioId: string, @Res() res: Response) {
    try {
      const usuario = await this.prisma.usuario.findUnique({ where: { id: usuarioId } });
      if (!usuario) {
        return res.status(HttpStatus.NOT_FOUND).json({ error: 'Usuário não encontrado.' });
      }
      if (!usuario.ultimasSalasAcessadas || usuario.ultimasSalasAcessadas.length === 0) {
        return res.status(HttpStatus.OK).json([]);
      }
      const salas = await this.prisma.salaEstudo.findMany({
        where: { id: { in: usuario.ultimasSalasAcessadas } },
      });
      const salasOrdenadas = usuario.ultimasSalasAcessadas
        .map((id) => salas.find((s) => s.id === id))
        .filter(Boolean);
      return res.status(HttpStatus.OK).json(salasOrdenadas);
    } catch (error) {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ error: 'Erro ao buscar salas recentes.', details: error });
    }
  }
  @ApiOperation({ summary: "Criar uma nova postagem em uma sala de estudo" })
  @ApiResponse({ status: 201, description: "Post criado com sucesso." })
  @Post('post')
  async criarPost(@Body() body: CriarPostDto, @Res() res: Response) {
    try {
      const post = await this.prisma.post.create({
        data: {
          salaId: body.salaId,
          autorId: body.autorId,
          conteudo: body.conteudo,
        },
      });
      return res.status(HttpStatus.CREATED).json(post);
    } catch (error) {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ error: 'Erro ao criar post.', details: error });
    }
  }
}
