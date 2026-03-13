import { Module } from '@nestjs/common';
import { AuthModule } from '/auth/auth.module';
import { ExamsModule } from '/exam/exam.module';
import { ExamsResolver } from './exams/exam.resolver';
import { UsersResolver } from './users/users.resolver';

@Module({
  imports: [AuthModule, ExamsModule],
  providers: [
    UsersResolver,
    ExamsResolver,
    // TODO: SessionsResolver
  ],
})
export class GqlModule {}
