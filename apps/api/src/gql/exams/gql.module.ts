import { Module } from '@nestjs/common';
import { ExamsModule } from '../../exam/exams.module';
import { ExamsResolver } from './exams.resolver';

@Module({
  imports: [ExamsModule],
  providers: [ExamsResolver],
})
export class GqlModule {}
