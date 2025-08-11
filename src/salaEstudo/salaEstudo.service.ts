import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class salaEstudoService {
  constructor(private readonly prisma: PrismaService) {}

  async updateSalaEstudoById(id: string, data: any) {
    return await this.prisma.salaEstudo.update({
      where: { id },
      data,
    });
  }

  async ensureDefaultRoom() {
    let defaultRoom = await this.prisma.salaEstudo.findFirst({ 
      where: { nome: 'thinkspace' } 
    });
    
    if (!defaultRoom) {
      defaultRoom = await this.prisma.salaEstudo.create({
        data: {
          nome: 'thinkspace',
          descricao: 'Sala padrão para todos os usuários',
          topicos: ['geral', 'estudo'],
          banner: 'https://ui-avatars.com/api/?name=Thinkspace&background=8e44ad&color=fff',
          moderador: {
            connect: { id: '7c40658f-f4e5-44de-a5ec-b50d0805c313' }
          }
        }
      });

      const defaultCommunity = await this.prisma.topicoComunidade.create({
        data: {
          id: 'thinkspace-comunidade-id',
          nome: 'thinkspace-comunidade',
          salaId: defaultRoom.id
        }
      });

      return { sala: defaultRoom, topico: defaultCommunity };
    }

    return { sala: defaultRoom, topico: null };
  }

  async addUserToDefaultRoom(userId: string) {
    const defaultRoom = await this.prisma.salaEstudo.findFirst({ 
      where: { nome: 'thinkspace' } 
    });
    
    if (!defaultRoom) {
      throw new Error('Sala padrão não encontrada. Execute o salaEstudo primeiro.');
    }

    const existingMember = await this.prisma.membroSala.findFirst({
      where: {
        usuarioId: userId,
        salaId: defaultRoom.id
      }
    });

    if (!existingMember) {
      await this.prisma.membroSala.create({
        data: {
          usuarioId: userId,
          salaId: defaultRoom.id,
          funcao: userId === '7c40658f-f4e5-44de-a5ec-b50d0805c313' ? 'MODERADOR' : 'MEMBRO'
        }
      });
    }

    return defaultRoom;
  }

  async ensureAllUsersInDefaultRoom() {
    const defaultRoom = await this.prisma.salaEstudo.findFirst({ 
      where: { nome: 'thinkspace' } 
    });
    
    if (!defaultRoom) {
      throw new Error('Sala padrão não encontrada. Execute o salaEstudo primeiro.');
    }

    const users = await this.prisma.usuario.findMany();
    const addedUsers = [];

    for (const user of users) {
      const existingMember = await this.prisma.membroSala.findFirst({
        where: {
          usuarioId: user.id,
          salaId: defaultRoom.id
        }
      });

      if (!existingMember) {
        await this.prisma.membroSala.create({
          data: {
            usuarioId: user.id,
            salaId: defaultRoom.id,
            funcao: user.id === '7c40658f-f4e5-44de-a5ec-b50d0805c313' ? 'MODERADOR' : 'MEMBRO'
          }
        });
        addedUsers.push(user.id);
      }
    }

    return { 
      message: `Usuários adicionados à sala padrão: ${addedUsers.length}`,
      addedUsers 
    };
  }
} 