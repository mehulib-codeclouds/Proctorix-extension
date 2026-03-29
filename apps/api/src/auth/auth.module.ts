import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Session } from '/entities/session.entity';
import { User } from '/entities/user.entity';
import { MailModule } from '/mail/mail.module';
import { SessionsService } from './sessions/sessions.service';
import { UsersService } from './users/users.service';
import { UsersSubscriber } from './users/users.subscriber';

@Module({
  imports: [TypeOrmModule.forFeature([User, Session]), MailModule],
  providers: [UsersService, UsersSubscriber, SessionsService],
  exports: [UsersService, SessionsService],
})
export class AuthModule {}
