import { Controller, Get, Param, Query } from '@nestjs/common';
import { MetricasService } from './metricas.service';

@Controller('metricas')
export class MetricasController {
  constructor(private readonly metricasService: MetricasService) {}

  @Get(':userId')
  async getMetricas(@Param('userId') userId: string, @Query('weeksAgo') weeksAgo?: string) {
    const weeks = weeksAgo ? Number(weeksAgo) : 0;
    return await this.metricasService.getMetricasAluno(userId, weeks);
  }

  @Get('ranking')
  async getRanking() {
    return await this.metricasService.getRanking();
  }
}
