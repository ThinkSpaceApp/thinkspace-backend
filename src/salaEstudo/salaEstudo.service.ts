import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

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
    const allDefaultRooms = await this.prisma.salaEstudo.findMany({
      where: {
        nome: {
          equals: "ThinkSpace",
          mode: "insensitive"
        }
      }
    });
    let defaultRoom = allDefaultRooms[0];

    if (allDefaultRooms.length > 1) {
      const toDeleteIds = allDefaultRooms.slice(1).map(sala => sala.id);
      await this.prisma.$transaction(
        toDeleteIds.map(id => this.prisma.salaEstudo.delete({ where: { id } }))
      );
    }

    if (!defaultRoom) {
      defaultRoom = await this.prisma.salaEstudo.create({
        data: {
          nome: "ThinkSpace",
          descricao:
            "Um espaço criado para impulsionar sua produtividade e estimular a troca de ideias. Aqui você pode estudar com foco, compartilhar experiências e aprender em comunidade.",
          topicos: ["Produtividade", "Comunidade"],
          banner: "https://i.imgur.com/p5ACfTO.png",
          moderador: {
            connect: { id: "1bbaf1f7-746a-4574-b53c-038349d62a6e" },
          },
        },
      });
    }

    let defaultCommunity = await this.prisma.topicoComunidade.findUnique({
      where: { id: "thinkspace-comunidade-id" },
    });
    if (!defaultCommunity) {
      defaultCommunity = await this.prisma.topicoComunidade.create({
        data: {
          id: "thinkspace-comunidade-id",
          nome: "thinkspace-comunidade",
          salaId: defaultRoom.id,
        },
      });
      return { sala: defaultRoom, topico: defaultCommunity };
    } else {
      return { sala: defaultRoom, topico: null };
    }
  }

  async addUserToDefaultRoom(userId: string) {
    const defaultRoom = await this.prisma.salaEstudo.findFirst({
      where: {
        nome: {
          equals: "ThinkSpace",
          mode: "insensitive"
        }
      }
    });

    if (!defaultRoom) {
      return null;
    }

    const existingMember = await this.prisma.membroSala.findFirst({
      where: {
        usuarioId: userId,
        salaId: defaultRoom.id,
      },
    });

    if (!existingMember) {
      await this.prisma.membroSala.create({
        data: {
          usuarioId: userId,
          salaId: defaultRoom.id,
          funcao: userId === "1bbaf1f7-746a-4574-b53c-038349d62a6e" ? "MODERADOR" : "MEMBRO",
        },
      });
    }

    return defaultRoom;
  }

  async ensureAllUsersInDefaultRoom() {
    try {
      const defaultRoom = await this.prisma.salaEstudo.findFirst({
        where: { nome: "ThinkSpace" },
      });
      if (!defaultRoom) {
        return null;
      }
      const users = await this.prisma.usuario.findMany();
      const addedUsers = [];
      for (const user of users) {
        try {
          const existingMember = await this.prisma.membroSala.findFirst({
            where: {
              usuarioId: user.id,
              salaId: defaultRoom.id,
            },
          });
          if (!existingMember) {
            await this.prisma.membroSala.create({
              data: {
                usuarioId: user.id,
                salaId: defaultRoom.id,
                funcao: user.id === "1bbaf1f7-746a-4574-b53c-038349d62a6e" ? "MODERADOR" : "MEMBRO",
              },
            });
            addedUsers.push(user.id);
          }
        } catch (userErr) {
          console.error(`Erro ao adicionar usuário ${user.id}:`, userErr);
        }
      }
      return {
        message: `Usuários adicionados à sala padrão: ${addedUsers.length}`,
        addedUsers,
      };
    } catch (err) {
      console.error("Erro geral em ensureAllUsersInDefaultRoom:", err);
      throw err;
    }
  }
}
