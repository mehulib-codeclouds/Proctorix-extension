import { Module } from '@nestjs/common';
import { AuthModule } from '/auth/auth.module';
import { ExamsModule } from '/exam/exam.module';
import { MCQAnswersResolver } from './answers/mcq-answers.resolver';
import { MSQAnswersResolver } from './answers/msq-answers.resolver';
import { ExamsResolver } from './exams/exam.resolver';
import { SessionsResolver } from './sessions/sessions.resolver';
import { UsersResolver } from './users/users.resolver';
import { QuestionsResolver } from './questions/questions.resolver';

@Module({
  imports: [AuthModule, ExamsModule],
  providers: [
    UsersResolver,
    SessionsResolver,
    ExamsResolver,
    MCQAnswersResolver,
    MSQAnswersResolver,
    QuestionsResolver,
  ],
  exports: [
    UsersResolver,
    ExamsResolver,
    QuestionsResolver,
  ]
})
export class GqlModule {}
