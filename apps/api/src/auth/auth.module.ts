import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '/entities/user.entity';
import { UsersService } from './users/users.service';

@Module({
  // TODO: SessionsService, MailModule, UsersSubscriber
  // imports: [TypeOrmModule.forFeature([User]), MailModule],
  imports: [TypeOrmModule.forFeature([User])],
  providers: [UsersService],
  exports: [UsersService],
})
export class AuthModule {}
