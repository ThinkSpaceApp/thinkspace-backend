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
          nome: 'ThinkSpace',
          descricao: 'Um espaço criado para impulsionar sua produtividade e estimular a troca de ideias. Aqui você pode estudar com foco, compartilhar experiências e aprender em comunidade.',
          topicos: ['Produtividade', 'Comunidade'],
          banner: 'https://i.imgur.com/p5ACfTO.png',
          moderador: {
            connect: { id: '7c40658f-f4e5-44de-a5ec-b50d0805c313' }
          }
        }
      });

      let defaultCommunity = await this.prisma.topicoComunidade.findUnique({
        where: { id: 'thinkspace-comunidade-id' }
      });
      if (!defaultCommunity) {
        defaultCommunity = await this.prisma.topicoComunidade.create({
          data: {
            id: 'thinkspace-comunidade-id',
            nome: 'thinkspace-comunidade',
            salaId: defaultRoom.id
          }
        });
        return { sala: defaultRoom, topico: defaultCommunity };
      } else {
        return { sala: defaultRoom, topico: null };
      }
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
    try {
      const defaultRoom = await this.prisma.salaEstudo.findFirst({ 
        where: { nome: 'thinkspace' } 
      });
      if (!defaultRoom) {
        throw new Error('Sala padrão não encontrada. Execute o salaEstudo primeiro.');
      }
      const users = await this.prisma.usuario.findMany();
      const addedUsers = [];
      for (const user of users) {
        try {
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
        } catch (userErr) {
          console.error(`Erro ao adicionar usuário ${user.id}:`, userErr);
        }
      }
      return { 
        message: `Usuários adicionados à sala padrão: ${addedUsers.length}`,
        addedUsers 
      };
    } catch (err) {
      console.error('Erro geral em ensureAllUsersInDefaultRoom:', err);
      throw err;
    }
  }
} 