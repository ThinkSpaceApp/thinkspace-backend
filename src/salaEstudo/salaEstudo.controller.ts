import { Controller, Get, Res, HttpStatus, Post, Put, Param, Body, Delete } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiQuery } from "@nestjs/swagger";
import { Response } from "express";
import { salaEstudoService } from "./salaEstudo.service";
import { PrismaService } from "../prisma/prisma.service";
import { IsNotEmpty, IsEnum } from "class-validator";
import { sendDenunciaEmail, sendPostRemovidoEmail } from "./emailDenuncia";

  export enum MotivoDenuncia {
  SPAM_ENGANOSO = "Spam ou enganoso",
  DESINFORMACAO = "Desinformação",
  ATOS_PERIGOSOS = "Atos perigosos ou nocivos",
  INCITACAO_ODIO = "Conteúdo de incitação ao ódio ou abusivo",
  ASSEDIO_BULLYING = "Assédio ou bullying",
  TERRORISMO = "Promove terrorismo",
  CONTEUDO_SEXUAL = "Conteúdo sexual",
  CONTEUDO_VIOLENTO = "Conteúdo violento ou repulsivo",
  SUICIDIO_AUTOMUTILACAO = "Suicídio, automutilação ou transtornos alimentares",
  ABUSO_INFANTIL = "Abuso infantil"
}

  export class CriarDenunciaDto {
  @IsNotEmpty()
  postId!: string;
  @IsNotEmpty()
  denuncianteId!: string;
  @IsEnum(MotivoDenuncia)
  motivo!: MotivoDenuncia;
}


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
  @ApiOperation({ summary: "Criar uma nova sala de estudo" })
  @ApiResponse({ status: 201, description: "Sala de estudo criada com sucesso." })
  @ApiBody({
    description: 'Campos obrigatórios para criar uma sala de estudo',
    type: CriarSalaEstudoDto,
    examples: {
      exemplo: {
        summary: 'Exemplo de criação de sala',
        value: {
          nome: 'Sala de Matemática',
          descricao: 'Espaço para discutir matemática',
          tipo: 'PUBLICA',
          autorId: 'uuid-do-autor'
        }
      }
    }
  })
  @Post()
  async criarSalaEstudo(@Body() body: CriarSalaEstudoDto, @Res() res: Response) {
    try {
      if (!body.nome || !body.tipo || !body.autorId) {
        return res.status(HttpStatus.BAD_REQUEST).json({ error: 'Campos obrigatórios: nome, tipo, autorId.' });
      }
      const banners = [
        "https://i.imgur.com/XEpO0Vi.jpeg",
        "https://i.imgur.com/DxYeoLP.jpeg",
        "https://i.imgur.com/qeTMqbR.jpeg",
      ];
      const banner = banners[Math.floor(Math.random() * banners.length)];
      const sala = await this.prisma.salaEstudo.create({
        data: {
          nome: body.nome,
          descricao: body.descricao || '',
          tipo: body.tipo,
          moderadorId: body.autorId,
          banner: banner,
        }
      });
      await this.prisma.membroSala.create({
        data: {
          salaId: sala.id,
          usuarioId: body.autorId,
        }
      });
      return res.status(HttpStatus.CREATED).json({ sala, message: 'Sala de estudo criada com sucesso.' });
    } catch (error) {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ error: 'Erro ao criar sala de estudo.', details: error });
    }
  }
  @ApiOperation({ summary: "Seguir uma sala de estudo" })
  @ApiResponse({ status: 201, description: "Usuário agora faz parte da sala." })
  @ApiResponse({ status: 400, description: "Usuário já faz parte da sala." })
  @Post('sala/:salaId/seguir/:usuarioId')
  async seguirSalaEstudo(
    @Param('salaId') salaId: string,
    @Param('usuarioId') usuarioId: string,
    @Res() res: Response
  ) {
    try {
      const membro = await this.prisma.membroSala.findFirst({
        where: {
          salaId: salaId,
          usuarioId: usuarioId,
        }
      });
      if (membro) {
        await this.prisma.membroSala.delete({
          where: { usuarioId_salaId: { usuarioId, salaId } }
        });
        return res.status(HttpStatus.OK).json({ message: 'Usuário deixou de seguir a sala.' });
      }
      await this.prisma.membroSala.create({
        data: {
          salaId,
          usuarioId,
        }
      });
      return res.status(HttpStatus.CREATED).json({ message: 'Usuário agora faz parte da sala.' });
    } catch (error) {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ error: 'Erro ao seguir/desseguir sala de estudo.', details: error });
    }
  }

  @ApiOperation({ summary: "Listar salas que o usuário segue (participa)" })
  @ApiResponse({ status: 200, description: "Lista de salas que o usuário participa." })
  @Get('usuario/:usuarioId/salas-participando')
  async getSalasQueUsuarioParticipa(@Param('usuarioId') usuarioId: string, @Res() res: Response) {
    try {
      const membros = await this.prisma.membroSala.findMany({
        where: { usuarioId },
        select: { salaId: true }
      });
      const salaIds = membros.map(m => m.salaId);
      if (salaIds.length === 0) {
        return res.status(HttpStatus.OK).json([]);
      }
      const salas = await this.prisma.salaEstudo.findMany({
        where: { id: { in: salaIds } },
      });
      const salasComQuantidade = await Promise.all(
        salas.map(async (sala: any) => {
          const quantidadeEstudantes = await this.prisma.membroSala.count({
            where: {
              salaId: sala.id,
              usuario: { funcao: "ESTUDANTE" },
            },
          });
          return { ...sala, quantidadeEstudantes };
        })
      );
      return res.status(HttpStatus.OK).json(salasComQuantidade);
    } catch (error) {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ error: 'Erro ao buscar salas que o usuário participa.', details: error });
    }
  }
  constructor(
    private readonly salaEstudoService: salaEstudoService,
    private readonly prisma: PrismaService,
  ) {}

  @ApiOperation({ summary: "Listar todos os posts da plataforma com perfil do autor, nome, curtidas, comentários e quantidades" })
  @ApiResponse({ status: 200, description: "Lista de todos os posts gerais da plataforma." })
  @ApiQuery({
    name: 'usuarioId',
    required: false,
    description: 'ID do usuário logado para saber se curtiu cada post',
    type: String
  })
  @Get('posts-gerais')
  async getAllPostsGerais(@Res() res: Response) {
    try {
      const usuarioId = res.req.query.usuarioId as string | undefined;
      const posts = await this.prisma.post.findMany({
        select: {
          id: true,
          conteudo: true,
          criadoEm: true,
          curtidas: true,
          usuariosQueCurtiram: true,
          sala: {
            select: {
              id: true,
              nome: true,
            }
          },
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
      const paletteBg = ["7C3AED", "A78BFA", "ee8bc3ff", "8e44ad"];
      const result = posts.map((post: any) => {
        const usuariosQueCurtiram = Array.isArray(post.usuariosQueCurtiram)
          ? post.usuariosQueCurtiram.map((id: any) => String(id))
          : [];
        let foto = post.autor.foto;
        if (!foto || foto.includes("ui-avatars.com/api/?name=User")) {
          let iniciais = "";
          const nome = post.autor.primeiroNome?.trim() || "";
          const sobrenome = post.autor.sobrenome?.trim() || "";
          if (nome || sobrenome) {
            iniciais = `${nome.charAt(0)}${sobrenome.charAt(0)}`.toUpperCase();
          } else if (post.autor.nomeCompleto) {
            const partes = post.autor.nomeCompleto.trim().split(" ");
            iniciais =
              partes.length > 1
                ? `${partes[0][0]}${partes[1][0]}`.toUpperCase()
                : `${partes[0][0]}`.toUpperCase();
          } else if (post.autor.email) {
            iniciais = post.autor.email.charAt(0).toUpperCase();
          } else {
            iniciais = "U";
          }
          let corBg = paletteBg[0];
          if (post.autor.id) {
            const chars: string[] = Array.from(post.autor.id);
            const hash = chars.reduce((acc, c) => acc + c.charCodeAt(0), 0);
            corBg = paletteBg[hash % paletteBg.length];
          }
          foto = `https://ui-avatars.com/api/?name=${encodeURIComponent(iniciais)}&background=${corBg}&color=fff`;
        }
        return {
          id: post.id,
          conteudo: post.conteudo,
          criadoEm: post.criadoEm,
          curtidas: post.curtidas,
          curtidoPeloUsuario: usuarioId ? usuariosQueCurtiram.includes(String(usuarioId)) : false,
          sala: {
            id: post.sala?.id,
            nome: post.sala?.nome,
          },
          autor: {
            id: post.autor.id,
            nome: post.autor.nomeCompleto || `${post.autor.primeiroNome} ${post.autor.sobrenome}`.trim(),
            foto: foto,
            perfil: post.autor.PerfilUsuario?.[0] || null,
          },
          comentarios: post.comentarios,
          quantidadeComentarios: post.comentarios.length,
        };
      });
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
      const salas = await this.prisma.salaEstudo.findMany({
        select: {
          id: true,
          nome: true,
          descricao: true,
          tipo: true,
          banner: true,
          moderadorId: true,
          assunto: true,
          criadoEm: true,
          topicos: true,
        }
      });

      const palette = ["#7C3AED", "#a18ddfff", "#ee82a2ff", "#8e44ad"];
      const paletteBg = ["7C3AED", "A78BFA", "ee8bc3ff", "8e44ad"];


      const salasComInfo = await Promise.all(salas.map(async (sala: any, idx: number) => {
        const ultimosMembrosEstudantes = await this.prisma.membroSala.findMany({
          where: {
            salaId: sala.id,
            usuario: { funcao: "ESTUDANTE" },
          },
          take: 4,
          orderBy: { usuario: { ultimoLogin: "desc" } },
          include: {
            usuario: {
              select: {
                primeiroNome: true,
                sobrenome: true,
                foto: true,
                id: true,
                nomeCompleto: true,
                email: true,
              }
            }
          }
        });

        const quantidadeEstudantes = await this.prisma.membroSala.count({
          where: {
            salaId: sala.id,
            usuario: { funcao: "ESTUDANTE" },
          }
        });

        const avatares = ultimosMembrosEstudantes.map((m, uidx) => {
          const u = m.usuario;
          if (u.foto && !u.foto.includes("ui-avatars.com/api/?name=User")) {
            return u.foto;
          }
          let iniciais = "";
          const nome = u.primeiroNome?.trim() || "";
          const sobrenome = u.sobrenome?.trim() || "";
          if (nome || sobrenome) {
            iniciais = `${nome.charAt(0)}${sobrenome.charAt(0)}`.toUpperCase();
          } else if (u.nomeCompleto) {
            const partes = u.nomeCompleto.trim().split(" ");
            iniciais =
              partes.length > 1
                ? `${partes[0][0]}${partes[1][0]}`.toUpperCase()
                : `${partes[0][0]}`.toUpperCase();
          } else if (u.email) {
            iniciais = u.email.charAt(0).toUpperCase();
          } else {
            iniciais = "U";
          }
          const corBg = paletteBg[uidx % paletteBg.length];
          return `https://ui-avatars.com/api/?name=${encodeURIComponent(iniciais)}&background=${corBg}&color=fff`;
        });
        return {
          ...sala,
          quantidadeEstudantes,
          avataresUltimosUsuarios: avatares,
        };
      }));

      return res.status(HttpStatus.OK).json({
        salas: salasComInfo
      });
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

  @ApiOperation({ summary: "Denunciar um post" })
  @ApiResponse({ status: 201, description: "Denúncia registrada com sucesso." })
  @ApiBody({
    description: 'Campos obrigatórios para denunciar um post',
    schema: {
      type: 'object',
      properties: {
        postId: { type: 'string' },
        denuncianteId: { type: 'string' },
        motivo: {
          type: 'string',
          enum: Object.values(MotivoDenuncia),
          description: 'Motivo da denúncia'
        }
      },
      required: ['postId', 'denuncianteId', 'motivo']
    }
  })
  @Post('post/denunciar')
  async denunciarPost(@Body() body: CriarDenunciaDto, @Res() res: Response) {
    try {
      if (!body.postId || !body.denuncianteId || !body.motivo) {
        return res.status(HttpStatus.BAD_REQUEST).json({ error: 'Campos obrigatórios: postId, denuncianteId, motivo.' });
      }
      const denunciaExistente = await this.prisma.denuncia.findFirst({
        where: {
          postId: body.postId,
          denuncianteId: body.denuncianteId,
        }
      });
      if (denunciaExistente) {
        return res.status(HttpStatus.CONFLICT).json({ error: 'Você já denunciou este post.' });
      }
      const denuncia = await this.prisma.denuncia.create({
        data: {
          postId: body.postId,
          denuncianteId: body.denuncianteId,
          motivo: body.motivo,
        }
      });
      const usuario = await this.prisma.usuario.findUnique({
        where: { id: body.denuncianteId },
        select: { nomeCompleto: true, email: true }
      });
      const post = await this.prisma.post.findUnique({
        where: { id: body.postId },
        select: { conteudo: true }
      });
      const emailResult = await sendDenunciaEmail({
        to: 'suporte.thinkspace@gmail.com',
        usuario: { nome: usuario?.nomeCompleto || 'Desconhecido', email: usuario?.email || 'Desconhecido' },
        post: { conteudo: post?.conteudo || '' },
        motivo: body.motivo,
        denunciaId: denuncia.id
      });

      return res.status(HttpStatus.CREATED).json({ denuncia, message: 'Denúncia registrada com sucesso.', email: emailResult });

    } catch (error) {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ error: 'Erro ao registrar denúncia.', details: error });
    }
  }

  @Get('admin/denuncia/:denunciaId/confirmar')
  async confirmarDenuncia(@Param('denunciaId') denunciaId: string, @Res() res: Response) {
    try {
      const denuncia = await this.prisma.denuncia.findUnique({
        where: { id: denunciaId },
        select: { postId: true, motivo: true, denuncianteId: true }
      });
      if (!denuncia) {
        return res.status(404).send('Denúncia não encontrada.');
      }
      if (!denuncia.postId) {
        return res.status(400).send('Denúncia não possui um post associado.');
      }
      const post = await this.prisma.post.findUnique({
        where: { id: denuncia.postId },
        select: { id: true, conteudo: true, autorId: true }
      });
      if (!post) {
        return res.status(404).send('Post já removido ou não encontrado.');
      }
      const usuario = await this.prisma.usuario.findUnique({
        where: { id: post.autorId },
        select: { nomeCompleto: true, email: true }
      });
      await this.prisma.post.delete({ where: { id: post.id } });

      await this.prisma.notificacao.create({
        data: {
          usuarioId: post.autorId,
          titulo: 'Denúncia por violação na comunidade',
          mensagem: `Seu post foi removido por violar as diretrizes da comunidade.\n\nMotivo: ${denuncia.motivo}\n\nConteúdo denunciado: ${post.conteudo}`,
        }
      });

      await sendPostRemovidoEmail({
        to: 'suporte.thinkspace@gmail.com',
        usuario: { nome: usuario?.nomeCompleto || 'Desconhecido', email: usuario?.email || 'Desconhecido' },
        post: { conteudo: post.conteudo }
      });

      return res.send('<h2>Post removido e usuário notificado com sucesso.</h2>');
    } catch (error) {
      return res.status(500).send('Erro ao processar denúncia.');
    }
  }


  @ApiOperation({ summary: "Listar comentários de um post" })
  @ApiResponse({ status: 200, description: "Lista de comentários do post." })
  @ApiQuery({
    name: 'usuarioId',
    required: false,
    description: 'ID do usuário logado para saber se curtiu cada comentário',
    type: String
  })
  @Get("post/:postId/comentarios")
  async getComentariosByPost(@Param("postId") postId: string, @Res() res: Response) {
    try {
      const usuarioId = res.req.query.usuarioId as string | undefined;
      const denunciasCount = await this.prisma.denuncia.count({ where: { postId: postId } });
      if (denunciasCount >= 5) {
        return res.status(HttpStatus.OK).json({ status: "CONTEÚDO EM ANÁLISE E PODE SER OFENSIVO", comentarios: [] });
      }
      const comentarios = await this.prisma.comentario.findMany({
        where: { postId: postId },
        select: {
          id: true,
          conteudo: true,
          criadoEm: true,
          curtidas: true,
          usuariosQueCurtiram: true,
          autor: {
            select: {
              id: true,
              nomeCompleto: true,
              primeiroNome: true,
              sobrenome: true,
              foto: true,
            }
          },
        },
        orderBy: { criadoEm: 'asc' }
      });
      const paletteBg = ["7C3AED", "A78BFA", "ee8bc3ff", "8e44ad"];
      const comentariosFormatados = comentarios.map((comentario: any) => {
        const usuariosQueCurtiram = Array.isArray(comentario.usuariosQueCurtiram)
          ? comentario.usuariosQueCurtiram.map((id: any) => String(id))
          : [];
        let foto = comentario.autor.foto;
        if (!foto || foto.includes("ui-avatars.com/api/?name=User")) {
          let iniciais = "";
          const nome = comentario.autor.primeiroNome?.trim() || "";
          const sobrenome = comentario.autor.sobrenome?.trim() || "";
          if (nome || sobrenome) {
            iniciais = `${nome.charAt(0)}${sobrenome.charAt(0)}`.toUpperCase();
          } else if (comentario.autor.nomeCompleto) {
            const partes = comentario.autor.nomeCompleto.trim().split(" ");
            iniciais =
              partes.length > 1
                ? `${partes[0][0]}${partes[1][0]}`.toUpperCase()
                : `${partes[0][0]}`.toUpperCase();
          } else if (comentario.autor.email) {
            iniciais = comentario.autor.email.charAt(0).toUpperCase();
          } else {
            iniciais = "U";
          }
          let corBg = paletteBg[0];
          if (comentario.autor.id) {
            const chars: string[] = Array.from(comentario.autor.id);
            const hash = chars.reduce((acc, c) => acc + c.charCodeAt(0), 0);
            corBg = paletteBg[hash % paletteBg.length];
          }
          foto = `https://ui-avatars.com/api/?name=${encodeURIComponent(iniciais)}&background=${corBg}&color=fff`;
        }
        return {
          id: comentario.id,
          conteudo: comentario.conteudo,
          criadoEm: comentario.criadoEm,
          curtidas: comentario.curtidas,
          quantidadeCurtidas: usuariosQueCurtiram.length,
          curtidoPeloUsuario: usuarioId ? usuariosQueCurtiram.includes(String(usuarioId)) : false,
          autor: {
            id: comentario.autor.id,
            nome: comentario.autor.nomeCompleto || `${comentario.autor.primeiroNome} ${comentario.autor.sobrenome}`.trim(),
            foto: foto,
          },
        };
      });
      return res.status(HttpStatus.OK).json(comentariosFormatados);
    } catch (error) {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ error: "Erro ao buscar comentários.", details: error });
    }
  }

  @ApiOperation({ summary: "Curtir ou descurtir um comentário" })
  @ApiResponse({ status: 200, description: "Status atualizado da curtida do comentário." })
  @Post('comentario/:comentarioId/curtir/:usuarioId')
  async toggleCurtirComentario(@Param('comentarioId') comentarioId: string, @Param('usuarioId') usuarioId: string, @Res() res: Response) {
    try {
      const comentario = await this.prisma.comentario.findUnique({ where: { id: comentarioId } });
      if (!comentario) {
        return res.status(HttpStatus.NOT_FOUND).json({ error: 'Comentário não encontrado.' });
      }
      let usuariosQueCurtiram: string[] = (comentario as any).usuariosQueCurtiram || [];
      let curtiu: boolean;
      if (usuariosQueCurtiram.includes(usuarioId)) {
        usuariosQueCurtiram = usuariosQueCurtiram.filter(id => id !== usuarioId);
        curtiu = false;
      } else {
        usuariosQueCurtiram.push(usuarioId);
        curtiu = true;
      }
      await this.prisma.comentario.update({
        where: { id: comentarioId },
        data: {
          usuariosQueCurtiram: usuariosQueCurtiram,
          curtidas: usuariosQueCurtiram.length,
        },
      });
      return res.status(HttpStatus.OK).json({ curtiu, curtidas: usuariosQueCurtiram.length });
    } catch (error) {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ error: 'Erro ao atualizar curtida do comentário.', details: error });
    }
  }

  @ApiOperation({ summary: "Excluir um comentário" })
  @ApiResponse({ status: 200, description: "Comentário excluído com sucesso." })
  @ApiResponse({ status: 404, description: "Comentário não encontrado." })
  @Delete('comentario/:comentarioId')
  async excluirComentario(@Param('comentarioId') comentarioId: string, @Res() res: Response) {
    try {
      const comentario = await this.prisma.comentario.findUnique({ where: { id: comentarioId } });
      if (!comentario) {
        return res.status(HttpStatus.NOT_FOUND).json({ error: 'Comentário não encontrado.' });
      }
      await this.prisma.comentario.delete({ where: { id: comentarioId } });
      return res.status(HttpStatus.OK).json({ message: 'Comentário excluído com sucesso.' });
    } catch (error) {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ error: 'Erro ao excluir comentário.', details: error });
    }
  }

  @ApiOperation({ summary: "Atualizar um comentário" })
  @ApiResponse({ status: 200, description: "Comentário atualizado com sucesso." })
  @ApiResponse({ status: 404, description: "Comentário não encontrado." })
  @ApiBody({
    description: 'Conteúdo atualizado do comentário',
    schema: {
      type: 'object',
      properties: {
        conteudo: { type: 'string', example: 'Novo conteúdo do comentário' }
      },
      required: ['conteudo']
    }
  })
  @Put('comentario/:comentarioId')
  async atualizarComentario(
    @Param('comentarioId') comentarioId: string,
    @Body() body: { conteudo: string },
    @Res() res: Response
  ) {
    try {
      if (!body.conteudo || typeof body.conteudo !== 'string' || body.conteudo.trim().length < 2) {
        return res.status(HttpStatus.BAD_REQUEST).json({ error: 'O conteúdo do comentário deve ter pelo menos 2 caracteres.' });
      }
      const comentario = await this.prisma.comentario.findUnique({ where: { id: comentarioId } });
      if (!comentario) {
        return res.status(HttpStatus.NOT_FOUND).json({ error: 'Comentário não encontrado.' });
      }
      const comentarioAtualizado = await this.prisma.comentario.update({
        where: { id: comentarioId },
        data: { conteudo: body.conteudo },
      });
      return res.status(HttpStatus.OK).json({ comentario: comentarioAtualizado, message: 'Comentário atualizado com sucesso.' });
    } catch (error) {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ error: 'Erro ao atualizar comentário.', details: error });
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

  @ApiOperation({ summary: "Salvar ou remover salvamento de um post" })
  @ApiResponse({ status: 200, description: "Status atualizado do salvamento do post." })
  @Post("post/:postId/salvar/:usuarioId")
  async toggleSalvarPost(@Param("postId") postId: string, @Param("usuarioId") usuarioId: string, @Res() res: Response) {
    try {
      const salvo = await this.prisma.postSalvo.findUnique({ where: { usuarioId_postId: { usuarioId, postId } } });
      if (salvo) {
        await this.prisma.postSalvo.delete({ where: { usuarioId_postId: { usuarioId, postId } } });
        return res.status(HttpStatus.OK).json({ salvo: false, message: "Salvamento removido com sucesso." });
      } else {
        await this.prisma.postSalvo.create({ data: { postId, usuarioId } });
        return res.status(HttpStatus.CREATED).json({ salvo: true, message: "Post salvo com sucesso." });
      }
    } catch (error) {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ error: "Erro ao atualizar salvamento.", details: error });
    }
  }
  @ApiOperation({ summary: "Listar todos os posts de uma sala de estudo" })
  @ApiResponse({ status: 200, description: "Lista de posts da sala." })
  @ApiQuery({
    name: 'usuarioId',
    required: false,
    description: 'ID do usuário logado para saber se curtiu cada post',
    type: String
  })
  @Get(":salaId/posts")
  async getPostsBySala(@Param("salaId") salaId: string, @Res() res: Response) {
    try {
      const usuarioId = res.req.query.usuarioId as string | undefined;
      const posts = await this.prisma.post.findMany({
        where: { salaId },
        select: {
          id: true,
          conteudo: true,
          criadoEm: true,
          curtidas: true,
          usuariosQueCurtiram: true,
          autor: {
            select: {
              id: true,
              nomeCompleto: true,
              primeiroNome: true,
              sobrenome: true,
              foto: true,
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
      const paletteBg = ["7C3AED", "A78BFA", "ee8bc3ff", "8e44ad"];
      const postsComStatus = await Promise.all(posts.map(async (post: any) => {
        const usuariosQueCurtiram = Array.isArray(post.usuariosQueCurtiram)
          ? post.usuariosQueCurtiram.map((id: any) => String(id))
          : [];
        const denunciasCount = await this.prisma.denuncia.count({ where: { postId: post.id } });
        let foto = post.autor.foto;
        if (!foto || foto.includes("ui-avatars.com/api/?name=User")) {
          let iniciais = "";
          const nome = post.autor.primeiroNome?.trim() || "";
          const sobrenome = post.autor.sobrenome?.trim() || "";
          if (nome || sobrenome) {
            iniciais = `${nome.charAt(0)}${sobrenome.charAt(0)}`.toUpperCase();
          } else if (post.autor.nomeCompleto) {
            const partes = post.autor.nomeCompleto.trim().split(" ");
            iniciais =
              partes.length > 1
                ? `${partes[0][0]}${partes[1][0]}`.toUpperCase()
                : `${partes[0][0]}`.toUpperCase();
          } else if (post.autor.email) {
            iniciais = post.autor.email.charAt(0).toUpperCase();
          } else {
            iniciais = "U";
          }
          let corBg = paletteBg[0];
          if (post.autor.id) {
            const chars: string[] = Array.from(post.autor.id);
            const hash: number = chars.reduce((acc: number, c: string) => acc + c.charCodeAt(0), 0);
            corBg = paletteBg[hash % paletteBg.length];
          }
          foto = `https://ui-avatars.com/api/?name=${encodeURIComponent(iniciais)}&background=${corBg}&color=fff`;
        }
        const autorNome = post.autor.nomeCompleto || `${post.autor.primeiroNome} ${post.autor.sobrenome}`.trim();
        if (denunciasCount >= 5) {
          return {
            ...post,
            conteudo: undefined,
            status: "CONTEÚDO EM ANÁLISE E PODE SER OFENSIVO",
            autor: {
              id: post.autor.id,
              nome: autorNome,
              foto: foto,
            },
            curtidoPeloUsuario: usuarioId ? usuariosQueCurtiram.includes(String(usuarioId)) : false,
            quantidadeComentarios: post.comentarios.length,
          };
        }
        return {
          ...post,
          autor: {
            id: post.autor.id,
            nome: autorNome,
            foto: foto,
          },
          curtidoPeloUsuario: usuarioId ? usuariosQueCurtiram.includes(String(usuarioId)) : false,
          quantidadeComentarios: post.comentarios.length,
        };
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
      const paletteBg = ["7C3AED", "A78BFA", "ee8bc3ff", "8e44ad"];
      const salasComQuantidade = await Promise.all(
        usuario.ultimasSalasAcessadas
          .map((id) => salas.find((s) => s.id === id))
          .filter(Boolean)
          .map(async (sala: any) => {
            const ultimosMembrosEstudantes = await this.prisma.membroSala.findMany({
              where: {
                salaId: sala.id,
                usuario: { funcao: "ESTUDANTE" },
              },
              take: 4,
              orderBy: { usuario: { ultimoLogin: "desc" } },
              include: {
                usuario: {
                  select: {
                    primeiroNome: true,
                    sobrenome: true,
                    foto: true,
                    id: true,
                    nomeCompleto: true,
                    email: true,
                  }
                }
              }
            });
            const quantidadeEstudantes = await this.prisma.membroSala.count({
              where: {
                salaId: sala.id,
                usuario: { funcao: "ESTUDANTE" },
              },
            });
            const avataresUltimosUsuarios = ultimosMembrosEstudantes.map((m, uidx) => {
              const u = m.usuario;
              if (u.foto && !u.foto.includes("ui-avatars.com/api/?name=User")) {
                return u.foto;
              }
              let iniciais = "";
              const nome = u.primeiroNome?.trim() || "";
              const sobrenome = u.sobrenome?.trim() || "";
              if (nome || sobrenome) {
                iniciais = `${nome.charAt(0)}${sobrenome.charAt(0)}`.toUpperCase();
              } else if (u.nomeCompleto) {
                const partes = u.nomeCompleto.trim().split(" ");
                iniciais =
                  partes.length > 1
                    ? `${partes[0][0]}${partes[1][0]}`.toUpperCase()
                    : `${partes[0][0]}`.toUpperCase();
              } else if (u.email) {
                iniciais = u.email.charAt(0).toUpperCase();
              } else {
                iniciais = "U";
              }
              const corBg = paletteBg[uidx % paletteBg.length];
              return `https://ui-avatars.com/api/?name=${encodeURIComponent(iniciais)}&background=${corBg}&color=fff`;
            });
            return { ...sala, quantidadeEstudantes, avataresUltimosUsuarios };
          })
      );
      return res.status(HttpStatus.OK).json(salasComQuantidade);
    } catch (error) {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ error: 'Erro ao buscar salas recentes.', details: error });
    }
  }
  @ApiOperation({ summary: "Criar uma nova postagem em uma sala de estudo" })
  @ApiResponse({ status: 201, description: "Post criado com sucesso." })
  @ApiBody({
    description: 'Campos obrigatórios para criar uma postagem',
    type: CriarPostDto,
    examples: {
      exemplo: {
        summary: 'Exemplo de criação de post',
        value: {
          salaId: 'uuid-da-sala',
          autorId: 'uuid-do-autor',
          conteudo: 'Conteúdo da postagem'
        }
      }
    }
  })
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
      const [autor, sala] = await Promise.all([
        this.prisma.usuario.findUnique({
          where: { id: post.autorId },
          select: { foto: true, nomeCompleto: true, primeiroNome: true, sobrenome: true }
        }),
        this.prisma.salaEstudo.findUnique({
          where: { id: post.salaId },
          select: { nome: true }
        })
      ]);
      return res.status(HttpStatus.CREATED).json({
        post,
        autor: {
          foto: autor?.foto || null,
          nome: autor?.nomeCompleto || `${autor?.primeiroNome || ''} ${autor?.sobrenome || ''}`.trim()
        },
        sala: {
          nome: sala?.nome || null
        },
        message: 'Post criado com sucesso.'
      });
    } catch (error) {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ error: 'Erro ao criar post.', details: error });
    }
  }

  @ApiOperation({ summary: "Atualizar um post" })
  @ApiResponse({ status: 200, description: "Post atualizado com sucesso." })
  @ApiResponse({ status: 404, description: "Post não encontrado." })
  @ApiBody({
    description: 'Conteúdo atualizado do post',
    schema: {
      type: 'object',
      properties: {
        conteudo: { type: 'string', example: 'Novo conteúdo do post' }
      },
      required: ['conteudo']
    }
  })
  @Put('post/:postId')
  async atualizarPost(
    @Param('postId') postId: string,
    @Body() body: { conteudo: string },
    @Res() res: Response
  ) {
    try {
      if (!body.conteudo || typeof body.conteudo !== 'string' || body.conteudo.trim().length < 5) {
        return res.status(HttpStatus.BAD_REQUEST).json({ error: 'O conteúdo do post deve ter pelo menos 5 caracteres.' });
      }
      const post = await this.prisma.post.findUnique({ where: { id: postId } });
      if (!post) {
        return res.status(HttpStatus.NOT_FOUND).json({ error: 'Post não encontrado.' });
      }
      const postAtualizado = await this.prisma.post.update({
        where: { id: postId },
        data: { conteudo: body.conteudo },
      });
      return res.status(HttpStatus.OK).json({ post: postAtualizado, message: 'Post atualizado com sucesso.' });
    } catch (error) {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ error: 'Erro ao atualizar post.', details: error });
    }
  }

  @ApiOperation({ summary: "Curtir ou descurtir um post" })
  @ApiResponse({ status: 200, description: "Status atualizado da curtida do post." })
  @Post('post/:postId/curtir/:usuarioId')
  async toggleCurtirPost(@Param('postId') postId: string, @Param('usuarioId') usuarioId: string, @Res() res: Response) {
    try {
      const post = await this.prisma.post.findUnique({ where: { id: postId } });
      if (!post) {
        return res.status(HttpStatus.NOT_FOUND).json({ error: 'Post não encontrado.' });
      }
      let usuariosQueCurtiram: string[] = post.usuariosQueCurtiram || [];
      let curtiu: boolean;
      if (usuariosQueCurtiram.includes(usuarioId)) {
        usuariosQueCurtiram = usuariosQueCurtiram.filter(id => id !== usuarioId);
        curtiu = false;
      } else {
        usuariosQueCurtiram.push(usuarioId);
        curtiu = true;
      }
      await this.prisma.post.update({
        where: { id: postId },
        data: {
          usuariosQueCurtiram: usuariosQueCurtiram,
          curtidas: usuariosQueCurtiram.length,
        },
      });
      return res.status(HttpStatus.OK).json({ curtiu, curtidas: usuariosQueCurtiram.length });
    } catch (error) {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ error: 'Erro ao atualizar curtida.', details: error });
    }
  }
  
  @ApiOperation({ summary: "Obter detalhes de um post pelo id" })
  @ApiResponse({ status: 200, description: "Detalhes do post encontrado." })
  @ApiResponse({ status: 404, description: "Post não encontrado." })
  @ApiQuery({
    name: 'usuarioId',
    required: false,
    description: 'ID do usuário logado para saber se curtiu o post',
    type: String
  })
  @Get('post/:postId')
  async getPostById(@Param('postId') postId: string, @Res() res: Response) {
    try {
      const usuarioId = res.req.query.usuarioId as string | undefined;
      const post = await this.prisma.post.findUnique({
        where: { id: postId },
        select: {
          id: true,
          conteudo: true,
          criadoEm: true,
          curtidas: true,
          usuariosQueCurtiram: true,
          sala: {
            select: {
              id: true,
              nome: true,
              descricao: true,
              banner: true,
              tipo: true,
              moderadorId: true,
              assunto: true,
              criadoEm: true,
              topicos: true,
            }
          },
          autor: {
            select: {
              id: true,
              primeiroNome: true,
              sobrenome: true,
              nomeCompleto: true,
              foto: true,
              email: true,
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
      });
      if (!post) {
        return res.status(HttpStatus.NOT_FOUND).json({ error: 'Post não encontrado.' });
      }
      const paletteBg = ["7C3AED", "A78BFA", "ee8bc3ff", "8e44ad"];
      let nomeAutor = '';
      if (post.autor?.nomeCompleto && post.autor.nomeCompleto.trim()) {
        nomeAutor = post.autor.nomeCompleto.trim();
      } else if ((post.autor?.primeiroNome && post.autor.primeiroNome.trim()) || (post.autor?.sobrenome && post.autor.sobrenome.trim())) {
        nomeAutor = `${post.autor?.primeiroNome?.trim() || ''} ${post.autor?.sobrenome?.trim() || ''}`.trim();
      } else if (post.autor?.email) {
        nomeAutor = post.autor.email;
      } else {
        nomeAutor = 'Usuário';
      }
      let foto = post.autor.foto;
      if (!foto || foto.includes("ui-avatars.com/api/?name=User")) {
        let iniciais = "";
        const nome = post.autor.primeiroNome?.trim() || "";
        const sobrenome = post.autor.sobrenome?.trim() || "";
        if (nome || sobrenome) {
          iniciais = `${nome.charAt(0)}${sobrenome.charAt(0)}`.toUpperCase();
        } else if (post.autor.nomeCompleto) {
          const partes = post.autor.nomeCompleto.trim().split(" ");
          iniciais =
            partes.length > 1
              ? `${partes[0][0]}${partes[1][0]}`.toUpperCase()
              : `${partes[0][0]}`.toUpperCase();
        } else if (post.autor.email) {
          iniciais = post.autor.email.charAt(0).toUpperCase();
        } else {
          iniciais = "U";
        }
        let corBg = paletteBg[0];
        if (post.autor.id) {
          const chars: string[] = Array.from(post.autor.id);
          const hash = chars.reduce((acc: number, c) => acc + c.charCodeAt(0), 0);
          corBg = paletteBg[hash % paletteBg.length];
        }
        foto = `https://ui-avatars.com/api/?name=${encodeURIComponent(iniciais)}&background=${corBg}&color=fff`;
      }
      const curtidoPeloUsuario = usuarioId ? (post.usuariosQueCurtiram || []).includes(usuarioId) : false;
      const result = {
        id: post.id,
        conteudo: post.conteudo,
        criadoEm: post.criadoEm,
        curtidas: post.curtidas,
        curtidoPeloUsuario,
        sala: post.sala,
        autor: {
          id: post.autor.id,
          nome: nomeAutor,
          foto: foto,
          email: post.autor.email,
          perfil: post.autor.PerfilUsuario?.[0] || null,
        },
        comentarios: post.comentarios,
        quantidadeComentarios: post.comentarios.length,
      };
      return res.status(HttpStatus.OK).json(result);
    } catch (error) {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ error: 'Erro ao buscar post.', details: error });
    }
  }

  @ApiOperation({ summary: "Excluir um post e remover referências de salvamentos e curtidas" })
  @ApiResponse({ status: 200, description: "Post excluído com sucesso." })
  @ApiResponse({ status: 404, description: "Post não encontrado." })
  @Delete('post/:postId')
  async excluirPost(@Param('postId') postId: string, @Res() res: Response) {
    try {
      const post = await this.prisma.post.findUnique({ where: { id: postId } });
      if (!post) {
        return res.status(HttpStatus.NOT_FOUND).json({ error: 'Post não encontrado.' });
      }
      await this.prisma.postSalvo.deleteMany({ where: { postId } });
      await this.prisma.denuncia.deleteMany({ where: { postId } });
      await this.prisma.comentario.deleteMany({ where: { postId } });
      await this.prisma.post.delete({ where: { id: postId } });
      return res.status(HttpStatus.OK).json({ message: 'Post excluído com sucesso.' });
    } catch (error) {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ error: 'Erro ao excluir post.', details: error });
    }
  }

  @ApiOperation({ summary: "Listar posts salvos (favoritos) de um usuário" })
  @ApiResponse({ status: 200, description: "Lista de posts salvos pelo usuário." })
  @Get('usuario/:usuarioId/favoritos')
  async getFavoritosUsuario(@Param('usuarioId') usuarioId: string, @Res() res: Response) {
    try {
      const salvos = await this.prisma.postSalvo.findMany({
        where: { usuarioId },
        select: { postId: true },
      });
      const postIds = salvos.map((s: any) => s.postId);
      if (postIds.length === 0) {
        return res.status(HttpStatus.OK).json({ message: 'Nenhum material ou mensagem foi salvo.' });
      }
      const posts = await this.prisma.post.findMany({
        where: { id: { in: postIds } },
        select: {
          id: true,
          conteudo: true,
          criadoEm: true,
          curtidas: true,
          usuariosQueCurtiram: true,
          sala: { select: { id: true, nome: true } },
          autor: {
            select: {
              id: true,
              primeiroNome: true,
              sobrenome: true,
              nomeCompleto: true,
              foto: true,
              email: true,
              PerfilUsuario: { select: { avatar: true, nivel: true, xp: true } }
            }
          },
          comentarios: {
            select: { id: true, conteudo: true, criadoEm: true, autorId: true }
          },
        },
        orderBy: { criadoEm: 'desc' }
      });
      const paletteBg = ["7C3AED", "A78BFA", "ee8bc3ff", "8e44ad"];
      const result = posts.map((post: any) => {
        let nomeAutor = '';
        if (post.autor?.nomeCompleto && post.autor.nomeCompleto.trim()) {
          nomeAutor = post.autor.nomeCompleto.trim();
        } else if ((post.autor?.primeiroNome && post.autor.primeiroNome.trim()) || (post.autor?.sobrenome && post.autor.sobrenome.trim())) {
          nomeAutor = `${post.autor?.primeiroNome?.trim() || ''} ${post.autor?.sobrenome?.trim() || ''}`.trim();
        } else if (post.autor?.email) {
          nomeAutor = post.autor.email;
        } else {
          nomeAutor = 'Usuário';
        }
        let foto = post.autor.foto;
        if (!foto || foto.includes("ui-avatars.com/api/?name=User")) {
          let iniciais = "";
          const nome = post.autor.primeiroNome?.trim() || "";
          const sobrenome = post.autor.sobrenome?.trim() || "";
          if (nome || sobrenome) {
            iniciais = `${nome.charAt(0)}${sobrenome.charAt(0)}`.toUpperCase();
          } else if (post.autor.nomeCompleto) {
            const partes = post.autor.nomeCompleto.trim().split(" ");
            iniciais =
              partes.length > 1
                ? `${partes[0][0]}${partes[1][0]}`.toUpperCase()
                : `${partes[0][0]}`.toUpperCase();
          } else if (post.autor.email) {
            iniciais = post.autor.email.charAt(0).toUpperCase();
          } else {
            iniciais = "U";
          }
          let corBg = paletteBg[0];
          if (post.autor.id) {
            const chars: string[] = Array.from(post.autor.id);
            const hash = chars.reduce((acc: number, c: string) => acc + c.charCodeAt(0), 0);
            corBg = paletteBg[hash % paletteBg.length];
          }
          foto = `https://ui-avatars.com/api/?name=${encodeURIComponent(iniciais)}&background=${corBg}&color=fff`;
        }
        return {
          id: post.id,
          conteudo: post.conteudo,
          criadoEm: post.criadoEm,
          curtidas: post.curtidas,
          curtidoPeloUsuario: (post.usuariosQueCurtiram || []).includes(usuarioId),
          sala: {
            id: post.sala?.id,
            nome: post.sala?.nome,
          },
          autor: {
            id: post.autor.id,
            nome: nomeAutor,
            foto: foto,
            perfil: post.autor.PerfilUsuario?.[0] || null,
          },
          comentarios: post.comentarios,
          quantidadeComentarios: post.comentarios.length,
          salvo: true,
        };
      });
      return res.status(HttpStatus.OK).json(result);
    } catch (error) {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ error: 'Erro ao buscar favoritos.', details: error });
    }
  }
  static CriarComentarioDto = class {
    postId!: string;
    autorId!: string;
    conteudo!: string;
  };

  @ApiOperation({ summary: "Criar um comentário em um post" })
  @ApiResponse({ status: 201, description: "Comentário criado com sucesso." })
  @ApiBody({
    description: 'Campos obrigatórios para criar um comentário',
    type: salaEstudoController.CriarComentarioDto,
    examples: {
      exemplo: {
        summary: 'Exemplo de criação de comentário',
        value: {
          postId: 'uuid-do-post',
          autorId: 'uuid-do-autor',
          conteudo: 'Conteúdo do comentário'
        }
      }
    }
  })
  @Post('comentario')
  async criarComentario(@Body() body: { postId: string; autorId: string; conteudo: string }, @Res() res: Response) {
    try {
      if (!body.conteudo || typeof body.conteudo !== 'string' || body.conteudo.trim().length < 5) {
        return res.status(HttpStatus.BAD_REQUEST).json({ error: 'O conteúdo do comentário deve ter pelo menos 5 caracteres.' });
      }
      const comentario = await this.prisma.comentario.create({
        data: {
          postId: body.postId,
          autorId: body.autorId,
          conteudo: body.conteudo,
        },
      });
      return res.status(HttpStatus.CREATED).json({ comentario, message: 'Comentário criado com sucesso.' });
    } catch (error) {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ error: 'Erro ao criar comentário.', details: error });
    }
  }
  
  @ApiOperation({ summary: "Publicar material de estudo em uma sala" })
  @ApiResponse({ status: 201, description: "Material publicado na sala com sucesso." })
  @ApiBody({
    description: 'Campos obrigatórios para publicar material na sala',
    schema: {
      type: 'object',
      properties: {
        salaId: { type: 'string', example: 'uuid-da-sala' },
        materialId: { type: 'string', example: 'uuid-do-material' },
        materiaId: { type: 'string', example: 'uuid-da-materia' },
        autorId: { type: 'string', example: 'uuid-do-autor' },
        tags: { type: 'array', items: { type: 'string' }, example: ['tag1', 'tag2'] }
      },
      required: ['salaId', 'materialId', 'materiaId', 'autorId', 'tags']
    }
  })
  @Post('sala/:salaId/publicar-material')
  async publicarMaterialSala(
    @Param('salaId') salaId: string,
    @Body() body: { materialId: string; materiaId: string; autorId: string; tags: string[] },
    @Res() res: Response
  ) {
    try {
      if (!body.materialId || !body.materiaId || !body.autorId || !Array.isArray(body.tags) || body.tags.length !== 2) {
        return res.status(HttpStatus.BAD_REQUEST).json({ error: 'Todos os campos são obrigatórios e deve haver exatamente 2 tags.' });
      }
      const autor = await this.prisma.usuario.findUnique({ where: { id: body.autorId }, select: { foto: true } });
      if (!autor) {
        return res.status(HttpStatus.NOT_FOUND).json({ error: 'Autor não encontrado.' });
      }
      const material = await this.prisma.materialEstudo.findUnique({ where: { id: body.materialId } });
      if (!material) {
        return res.status(HttpStatus.NOT_FOUND).json({ error: 'Material de estudo não encontrado.' });
      }
      const sala = await this.prisma.salaEstudo.findUnique({ where: { id: salaId } });
      if (!sala) {
        return res.status(HttpStatus.NOT_FOUND).json({ error: 'Sala de estudo não encontrada.' });
      }
      const publicado = await this.prisma.salaEstudoMaterial.create({
        data: {
          materialId: body.materialId,
          salaId: salaId,
          materiaId: body.materiaId,
          autorId: body.autorId,
          avatarAutor: autor.foto,
          tags: body.tags,
        }
      });
      return res.status(HttpStatus.CREATED).json({ publicado, message: 'Material publicado na sala com sucesso.' });
    } catch (error) {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ error: 'Erro ao publicar material na sala.', details: error });
    }
  }

  @ApiOperation({ summary: "Adicionar material de estudo ao acervo do usuário" })
  @ApiResponse({ status: 201, description: "Material adicionado ao acervo do usuário com sucesso." })
  @ApiBody({
    description: 'Campos obrigatórios para adicionar material ao usuário',
    schema: {
      type: 'object',
      properties: {
        materialId: { type: 'string', example: 'uuid-do-material' },
        materiaId: { type: 'string', example: 'uuid-da-materia-do-usuario' }
      },
      required: ['materialId', 'materiaId']
    }
  })
  @Post('usuario/:usuarioId/adicionar-material')
  async adicionarMaterialAoUsuario(
    @Param('usuarioId') usuarioId: string,
    @Body() body: { materialId: string; materiaId: string },
    @Res() res: Response
  ) {
    try {
      const materialOriginal = await this.prisma.materialEstudo.findUnique({
        where: { id: body.materialId },
        include: { materia: true }
      });
      if (!materialOriginal) {
        return res.status(HttpStatus.NOT_FOUND).json({ error: 'Material de estudo não encontrado.' });
      }
      const materia = await this.prisma.materia.findFirst({
        where: {
          id: body.materiaId,
          usuarioId: usuarioId
        }
      });
      if (!materia) {
        return res.status(HttpStatus.BAD_REQUEST).json({ error: 'Matéria não encontrada para este usuário.' });
      }
      const novoMaterial = await this.prisma.materialEstudo.create({
        data: {
          titulo: materialOriginal.titulo,
          origem: materialOriginal.origem,
          tipoMaterial: materialOriginal.tipoMaterial,
          nomeDesignado: materialOriginal.nomeDesignado,
          materiaId: materia.id,
          topicos: materialOriginal.topicos,
          caminhoArquivo: materialOriginal.caminhoArquivo,
          pdfBinario: materialOriginal.pdfBinario,
          conteudo: materialOriginal.conteudo,
          assunto: materialOriginal.assunto,
          autorId: usuarioId,
          resumoIA: materialOriginal.resumoIA,
          flashcardsJson: materialOriginal.flashcardsJson,
          quizzesJson: materialOriginal.quizzesJson,
          respostasQuizJson: materialOriginal.respostasQuizJson,
          chatHistoryJson: materialOriginal.chatHistoryJson as any,
          quantidadeQuestoes: materialOriginal.quantidadeQuestoes,
          quantidadeFlashcards: materialOriginal.quantidadeFlashcards
        }
      });
      return res.status(HttpStatus.CREATED).json({ success: true, material: novoMaterial, message: 'Material adicionado ao acervo do usuário com sucesso.' });
    } catch (error) {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ error: 'Erro ao adicionar material ao usuário.', details: error });
    }
  }

  @ApiOperation({ summary: "Obter detalhes de um material publicado em uma sala" })
  @ApiResponse({ status: 200, description: "Detalhes do material publicado na sala." })
  @ApiResponse({ status: 404, description: "Material publicado na sala não encontrado." })
  @Get('sala/:salaId/material/:materialId')
  async getMaterialSalaDetalhes(
    @Param('salaId') salaId: string,
    @Param('materialId') materialId: string,
    @Res() res: Response
  ) {
    try {
      const materialSala = await this.prisma.salaEstudoMaterial.findUnique({
        where: {
          materialId_salaId: {
            materialId,
            salaId
          }
        },
        include: {
          material: true,
          sala: true
        }
      });
      if (!materialSala) {
        return res.status(HttpStatus.NOT_FOUND).json({ error: 'Material publicado na sala não encontrado.' });
      }
      const autor = await this.prisma.usuario.findUnique({
        where: { id: materialSala.autorId },
        select: { nomeCompleto: true, primeiroNome: true, sobrenome: true, foto: true }
      });
      const materia = await this.prisma.materia.findUnique({
        where: { id: materialSala.materiaId },
        select: { nome: true, cor: true, icone: true }
      });
      return res.status(HttpStatus.OK).json({
        id: materialSala.materialId,
        salaId: materialSala.salaId,
        atribuidoEm: materialSala.atribuidoEm,
        tags: materialSala.tags,
        autor: {
          id: materialSala.autorId,
          nome: autor?.nomeCompleto || `${autor?.primeiroNome || ''} ${autor?.sobrenome || ''}`.trim(),
          foto: autor?.foto || materialSala.avatarAutor || null
        },
        materia,
        material: materialSala.material
      });
    } catch (error) {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ error: 'Erro ao buscar detalhes do material publicado na sala.', details: error });
    }
  }

  @ApiOperation({ summary: "Registrar acesso a uma sala de estudo pelo usuário" })
  @ApiResponse({ status: 200, description: "Sala registrada como acessada recentemente." })
  @Post('usuario/:usuarioId/acessar-sala/:salaId')
  async registrarAcessoSala(
    @Param('usuarioId') usuarioId: string,
    @Param('salaId') salaId: string,
    @Res() res: Response
  ) {
    try {
      const usuario = await this.prisma.usuario.findUnique({ where: { id: usuarioId } });
      if (!usuario) {
        return res.status(HttpStatus.NOT_FOUND).json({ error: 'Usuário não encontrado.' });
      }
      const sala = await this.prisma.salaEstudo.findUnique({ where: { id: salaId } });
      if (!sala) {
        return res.status(HttpStatus.NOT_FOUND).json({ error: 'Sala de estudo não encontrada.' });
      }
      let ultimas = Array.isArray(usuario.ultimasSalasAcessadas) ? [...usuario.ultimasSalasAcessadas] : [];
      ultimas = ultimas.filter(id => id !== salaId);
      ultimas.unshift(salaId);
      if (ultimas.length > 10) ultimas = ultimas.slice(0, 10);
      await this.prisma.usuario.update({
        where: { id: usuarioId },
        data: { ultimasSalasAcessadas: ultimas }
      });
      return res.status(HttpStatus.OK).json({ message: 'Sala registrada como acessada recentemente.', ultimasSalasAcessadas: ultimas });
    } catch (error) {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ error: 'Erro ao registrar acesso à sala.', details: error });
    }
  }
    @ApiOperation({ summary: "Listar materiais de uma sala de estudo" })
    @ApiResponse({ status: 200, description: "Lista de materiais da sala." })
    @Get('sala/:salaId/materiais')
    async getMateriaisSala(@Param('salaId') salaId: string, @Res() res: Response) {
      try {
        if (!salaId) {
          return res.status(HttpStatus.BAD_REQUEST).json({ error: 'salaId é obrigatório.' });
        }
        const materiaisSala = await this.prisma.salaEstudoMaterial.findMany({
          where: { salaId },
          include: {
            material: true,
            sala: true
          },
          orderBy: { atribuidoEm: 'desc' }
        });
        const paletteBg = ["7C3AED", "A78BFA", "ee8bc3ff", "8e44ad"];
        const result = await Promise.all(materiaisSala.map(async (item: any, idx: number) => {
          const materia = item.materiaId
            ? await this.prisma.materia.findUnique({
                where: { id: item.materiaId },
                select: { nome: true, cor: true, icone: true }
              })
            : null;
          let autor = item.autor;
          if (!autor && item.autorId) {
            autor = await this.prisma.usuario.findUnique({
              where: { id: item.autorId },
              select: { id: true, nomeCompleto: true, primeiroNome: true, sobrenome: true, foto: true, email: true }
            });
          }
          let nomeAutor = '';
          if (autor?.nomeCompleto && autor.nomeCompleto.trim()) {
            nomeAutor = autor.nomeCompleto.trim();
          } else if ((autor?.primeiroNome && autor.primeiroNome.trim()) || (autor?.sobrenome && autor.sobrenome.trim())) {
            nomeAutor = `${autor?.primeiroNome?.trim() || ''} ${autor?.sobrenome?.trim() || ''}`.trim();
          } else if (autor?.email) {
            nomeAutor = autor.email;
          } else {
            nomeAutor = 'Usuário';
          }
          let foto = autor?.foto || item.avatarAutor || null;
          if (!foto || foto.includes("ui-avatars.com/api/?name=User")) {
            let iniciais = "";
            const nome = autor?.primeiroNome?.trim() || "";
            const sobrenome = autor?.sobrenome?.trim() || "";
            if (nome || sobrenome) {
              iniciais = `${nome.charAt(0)}${sobrenome.charAt(0)}`.toUpperCase();
            } else if (autor?.nomeCompleto) {
              const partes = autor.nomeCompleto.trim().split(" ");
              iniciais =
                partes.length > 1
                  ? `${partes[0][0]}${partes[1][0]}`.toUpperCase()
                  : `${partes[0][0]}`.toUpperCase();
            } else if (autor?.email) {
              iniciais = autor.email.charAt(0).toUpperCase();
            } else {
              iniciais = "U";
            }
            let corBg = paletteBg[0];
            if (autor?.id) {
              const chars: string[] = Array.from(autor.id);
              const hash = chars.reduce((acc: number, c: string) => acc + c.charCodeAt(0), 0);
              corBg = paletteBg[hash % paletteBg.length];
            } else {
              corBg = paletteBg[idx % paletteBg.length];
            }
            foto = `https://ui-avatars.com/api/?name=${encodeURIComponent(iniciais)}&background=${corBg}&color=fff`;
          }
          return {
            id: item.materialId,
            atribuidoEm: item.atribuidoEm,
            tags: item.tags,
            autor: {
              id: autor?.id || item.autorId,
              nome: nomeAutor,
              foto: foto
            },
            materia: materia,
            material: item.material
          };
        }));
        return res.status(HttpStatus.OK).json(result);
      } catch (error) {
        return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ error: 'Erro ao buscar materiais da sala.', details: error });
      }
    }

  @ApiOperation({ summary: "Excluir uma sala de estudo" })
  @ApiResponse({ status: 200, description: "Sala de estudo excluída com sucesso." })
  @ApiResponse({ status: 403, description: "Usuário não tem permissão para excluir esta sala." })
  @ApiResponse({ status: 404, description: "Sala de estudo não encontrada." })
  @Delete('sala/:salaId/excluir/:usuarioId')
  async excluirSalaEstudo(@Param('salaId') salaId: string, @Param('usuarioId') usuarioId: string, @Res() res: Response) {
    try {
      const sala = await this.prisma.salaEstudo.findUnique({ where: { id: salaId } });
      if (!sala) {
        return res.status(HttpStatus.NOT_FOUND).json({ error: 'Sala de estudo não encontrada.' });
      }
      if (sala.moderadorId !== usuarioId) {
        return res.status(HttpStatus.FORBIDDEN).json({ error: 'Apenas o moderador da sala pode excluí-la.' });
      }
      await this.prisma.membroSala.deleteMany({ where: { salaId } });
      await this.prisma.salaEstudoMaterial.deleteMany({ where: { salaId } });
      await this.prisma.post.deleteMany({ where: { salaId } });
      await this.prisma.salaEstudo.delete({ where: { id: salaId } });
      return res.status(HttpStatus.OK).json({ message: 'Sala de estudo excluída com sucesso. Os materiais publicados permanecem disponíveis para seus autores e usuários que copiaram.' });
    } catch (error) {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ error: 'Erro ao excluir sala de estudo.', details: error });
    }
  }
}