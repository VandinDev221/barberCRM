import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get()
  getApiRoot() {
    return {
      message: 'Barber CRM API',
      docs: '/api/docs',
      version: '1.0',
    };
  }

  @Get('health')
  health() {
    return { ok: true };
  }
}
