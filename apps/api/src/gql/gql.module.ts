import { Module } from '@nestjs/common';
import { AuthModule } from '/auth/auth.module';
import { ExamsModule } from '/exam/exam.module';
import { ExamsResolver } from './exams/exam.resolver';
import { SessionsResolver } from './sessions/sessions.resolver';
import { UsersResolver } from './users/users.resolver';
@Module({
  imports: [AuthModule, ExamsModule],
  providers: [UsersResolver, ExamsResolver, SessionsResolver],
})
export class GqlModule {}
