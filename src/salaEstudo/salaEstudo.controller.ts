import { Controller, Get, Res, HttpStatus, Post } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Response } from 'express';
import { salaEstudoService } from './salaEstudo.service';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('Sala de Estudo')
@Controller('sala-estudo')
export class salaEstudoController {
  constructor(
    private readonly salaEstudoService: salaEstudoService,
    private readonly prisma: PrismaService
  ) {}

  @ApiOperation({ summary: 'Criar sala padrão "thinkspace"' })
  @ApiResponse({ status: 201, description: 'Sala padrão criada com sucesso.' })
  @ApiResponse({ status: 200, description: 'Sala padrão já existe.' })
  @ApiResponse({ status: 500, description: 'Erro ao criar sala padrão.' })
  @Post('create-default-room')
  async createDefaultRoom(@Res() res: Response) {
    try {
      const result = await this.salaEstudoService.ensureDefaultRoom();
      if (result.topico) {
        return res.status(HttpStatus.CREATED).json({ 
          message: 'Sala padrão criada com sucesso.',
          salaId: result.sala.id,
          topicoId: result.topico.id
        });
      } else {
        return res.status(HttpStatus.OK).json({ 
          message: 'Sala padrão já existe.',
          salaId: result.sala.id
        });
      }
    } catch (error) {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ 
        error: 'Erro ao criar sala padrão.', 
        details: error 
      });
    }
  }

  @ApiOperation({ summary: 'Garantir sala padrão e adicionar todos os usuários nela' })
  @ApiResponse({ status: 200, description: 'Defaults ensured.' })
  @ApiResponse({ status: 500, description: 'Erro ao garantir dados padrão.' })
  @Get('salaEstudo-defaults')
  async salaEstudoDefaults(@Res() res: Response) {
    try {
      await this.salaEstudoService.ensureDefaultRoom();
      const result = await this.salaEstudoService.ensureAllUsersInDefaultRoom();
      return res.status(HttpStatus.OK).json({ 
        message: 'Defaults ensured.',
        addedUsers: result.addedUsers,
        totalAdded: result.addedUsers.length
      });
    } catch (error) {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ 
        error: 'Erro ao garantir dados padrão.', 
        details: error 
      });
    }
  }

  @ApiOperation({ summary: 'Obter status da sala padrão' })
  @ApiResponse({ status: 200, description: 'Status da sala padrão retornado com sucesso.' })
  @ApiResponse({ status: 404, description: 'Sala padrão não encontrada.' })
  @ApiResponse({ status: 500, description: 'Erro ao obter status da sala padrão.' })
  @Get('status')
  async getStatus(@Res() res: Response) {
    try {
      const defaultRoom = await this.prisma.salaEstudo.findFirst({
        where: { nome: 'thinkspace' },
        include: {
          membros: {
            include: {
              usuario: {
                select: {
                  id: true,
                  email: true,
                  primeiroNome: true,
                  sobrenome: true
                }
              }
            }
          },
          TopicoComunidade: true
        }
      });
      if (!defaultRoom) {
        return res.status(HttpStatus.NOT_FOUND).json({
          message: 'Sala padrão não encontrada'
        });
      }
      return res.status(HttpStatus.OK).json({
        sala: {
          id: defaultRoom.id,
          nome: defaultRoom.nome,
          descricao: defaultRoom.descricao,
          topicos: defaultRoom.topicos,
          banner: defaultRoom.banner,
          moderadorId: defaultRoom.moderadorId,
          totalMembros: defaultRoom.membros.length,
          topicosComunidade: defaultRoom.TopicoComunidade.length
        },
        membros: defaultRoom.membros.map(membro => ({
          usuarioId: membro.usuarioId,
          funcao: membro.funcao,
          ingressouEm: membro.ingressouEm,
          usuario: membro.usuario
        }))
      });
    } catch (error) {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        error: 'Erro ao obter status da sala padrão',
        details: error
      });
    }
  }
}
