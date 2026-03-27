import { Module } from '@nestjs/common';
import { AuthModule } from '/auth/auth.module';
import { ExamsModule } from '/exam/exam.module';
import { MCQAnswersResolver } from './answers/mcq-answers.resolver';
import { MSQAnswersResolver } from './answers/msq-answers.resolver';
import { ExamsResolver } from './exams/exam.resolver';
import { UsersResolver } from './users/users.resolver';

@Module({
  imports: [AuthModule, ExamsModule],
  providers: [
    UsersResolver,
    ExamsResolver,
    MCQAnswersResolver,
    MSQAnswersResolver,
    // TODO: SessionsResolver
  ],
})
export class GqlModule {}
