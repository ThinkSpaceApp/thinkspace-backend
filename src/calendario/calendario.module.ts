import { Module } from '@nestjs/common';
import { CalendarioController } from './calendario.controller';
import { CalendarioService } from './calendario.service';
import { PrismaModule } from '../prisma/prisma.module';
import { CalendarioRecentesController } from './calendario.recentes.controller';

@Module({
  imports: [PrismaModule],
  controllers: [CalendarioController, CalendarioRecentesController],
  providers: [CalendarioService],
  exports: [CalendarioService],
})
export class CalendarioModule {}
