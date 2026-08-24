import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHealth() {
    return {
      status: 'ok',
      service: 'Ramazan İnanç Hair Art Studio API',
      timestamp: new Date().toISOString(),
    };
  }
}
