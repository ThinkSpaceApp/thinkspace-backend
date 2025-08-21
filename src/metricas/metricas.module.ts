import { Module } from "@nestjs/common";
import { MetricasService } from "./metricas.service";
import { MetricasController } from "./metricas.controller";
import { PrismaService } from "../prisma/prisma.service";

@Module({
  providers: [MetricasService, PrismaService],
  controllers: [MetricasController],
})
export class MetricasModule {}
