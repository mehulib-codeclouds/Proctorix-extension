import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProctorEvent } from '../entities/proctor-event.entity';
import { ProctoringService } from './proctoring.service';
import { ProctoringGateway } from './proctoring.gateway';
import { ProctoringResolver } from './proctoring.resolver';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ProctorEvent]),
    AuthModule,
  ],
  providers: [ProctoringService, ProctoringGateway, ProctoringResolver],
  exports: [ProctoringService],
})
export class ProctoringModule {}