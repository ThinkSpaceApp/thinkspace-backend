import { Controller, Get, Res, HttpStatus, Post } from '@nestjs/common';
import { Response } from 'express';
import { SetupService } from './setup.service';
import { PrismaService } from '../prisma/prisma.service';

@Controller('sala-estudo')
export class SetupController {
  constructor(
    private readonly setupService: SetupService,
    private readonly prisma: PrismaService
  ) {}

  @Post('create-default-room')
  async createDefaultRoom(@Res() res: Response) {
    try {
      const result = await this.setupService.ensureDefaultRoom();
      
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

  @Get('setup-defaults')
  async setupDefaults(@Res() res: Response) {
    try {
      await this.setupService.ensureDefaultRoom();
      
      const result = await this.setupService.ensureAllUsersInDefaultRoom();

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
