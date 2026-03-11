import { Module } from '@nestjs/common';
import { AuthModule } from '/auth/auth.module';
import { UsersResolver } from './users/users.resolver';

@Module({
  imports: [AuthModule],
  providers: [
    UsersResolver,
    // TODO: SessionsResolver
  ],
})
export class GqlModule {}
