import { Controller, Get, Param } from '@nestjs/common';
import { MetricasService } from './metricas.service';

@Controller('metricas')
export class MetricasController {
  constructor(private readonly metricasService: MetricasService) {}

  @Get(':userId')
  async getMetricas(@Param('userId') userId: string) {
    return await this.metricasService.getMetricasAluno(userId);
  }
}
