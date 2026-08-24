import { Module } from '@nestjs/common';
import { ProfessionalServiceResolver } from './professional-service-resolver.service';

@Module({
  providers: [ProfessionalServiceResolver],
  exports: [ProfessionalServiceResolver],
})
export class SchedulingModule {}
