import { Controller, Post, Body, BadRequestException } from '@nestjs/common';
import { UsersService } from './users.service';
import { Usuario } from '@prisma/client';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post('cadastramento')
  async register(@Body() userData: Partial<Usuario>) {
    try {
      return await this.usersService.create(userData);
    } catch (error) {
      throw new BadRequestException((error as any).message);
    }
  }
}
