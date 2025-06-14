import { Controller, Get, Post, Body, Param, Req, UseGuards, BadRequestException } from '@nestjs/common';
import { Request } from 'express';
import { UsersService } from '../users/users.service';
import { AuthGuard } from '@nestjs/passport';

@UseGuards(AuthGuard('jwt'))
@Controller('materias')
export class MateriasController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  async getMaterias(@Req() req: Request) {
    return this.usersService.getMateriasByUserId((req.user as any).userId);
  }
  @Get(':id')
  async getMateriaById(@Req() req: Request, @Param('id') id: string) {
    const materias = await this.usersService.getMateriasByUserId((req.user as any).userId);
    const materia = materias.find((m: any) => m.id === id);
    if (!materia) {
      throw new BadRequestException('Matéria não encontrada.');
    }
    return materia;
  }

  @Post()
  async createMateria(@Req() req: Request, @Body() body: { nome: string; cor: string; icone: string }) {
    if (!body.nome || !body.cor || !body.icone) {
      throw new BadRequestException('Todos os campos são obrigatórios.');
    }
    return this.usersService.createMateria((req.user as any).userId, body);
  }
}
