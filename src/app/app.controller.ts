import { Controller, Get } from "@nestjs/common";

@Controller()
export class AppController {
  @Get()
  getRoot() {
    return {
      status: "ok",
      message: "Servidor ThinkSpace ativo em https://thinkspace.app.br",
    };
  }
}
