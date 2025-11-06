import { Module } from "@nestjs/common";
import { MetricasService } from "./metricas.service";
import { MetricasController } from "./metricas.controller";
import { PrismaService } from "../prisma/prisma.service";
import { SalaEstudoHelperService } from "../salaEstudo/salaEstudo.helper";

@Module({
  providers: [MetricasService, PrismaService, SalaEstudoHelperService],
  controllers: [MetricasController],
})
export class MetricasModule {}
