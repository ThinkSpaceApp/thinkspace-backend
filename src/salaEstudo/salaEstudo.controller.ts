
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
  // banner removido da doc: valor sempre fixo pelo backend
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

  @ApiOperation({ summary: "Listar todos os posts da plataforma com perfil do autor, nome, curtidas, comentários e quantidades" })
  @ApiResponse({ status: 200, description: "Lista de todos os posts gerais da plataforma." })
  @Get('posts-gerais')
  async getAllPostsGerais(@Res() res: Response) {
    try {
      const posts = await this.prisma.post.findMany({
        select: {
          id: true,
          conteudo: true,
          criadoEm: true,
          curtidas: true,
          autor: {
            select: {
              id: true,
              primeiroNome: true,
              sobrenome: true,
              nomeCompleto: true,
              foto: true,
              PerfilUsuario: {
                select: {
                  avatar: true,
                  nivel: true,
                  xp: true,
                }
              }
            }
          },
          comentarios: {
            select: {
              id: true,
              conteudo: true,
              criadoEm: true,
              autorId: true,
            }
          },
        },
        orderBy: { criadoEm: 'desc' }
      });
      if (!posts || posts.length === 0) {
        return res.status(HttpStatus.OK).json({ message: 'Não há nenhuma postagem no servidor.' });
      }
      const result = posts.map((post: any) => ({
        id: post.id,
        conteudo: post.conteudo,
        criadoEm: post.criadoEm,
        curtidas: post.curtidas,
        autor: {
          id: post.autor.id,
          nome: post.autor.nomeCompleto || `${post.autor.primeiroNome} ${post.autor.sobrenome}`.trim(),
          foto: post.autor.foto,
          perfil: post.autor.PerfilUsuario?.[0] || null,
        },
        quantidadeCurtidas: post.curtidas,
        comentarios: post.comentarios,
        quantidadeComentarios: post.comentarios.length,
      }));
      return res.status(HttpStatus.OK).json(result);
    } catch (error) {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ error: 'Erro ao buscar posts gerais.', details: error });
    }
  }

        
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
