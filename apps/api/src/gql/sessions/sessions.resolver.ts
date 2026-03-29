import { Inject, UseGuards } from '@nestjs/common';
import {
  Args,
  Mutation,
  Parent,
  Query,
  ResolveField,
  Resolver,
} from '@nestjs/graphql';
import { CurrentUser } from '/auth/decorators/current-user.decorator';
import { AuthGuard } from '/auth/guards/auth.guard';
import { SessionsService } from '/auth/sessions/sessions.service';
import { UsersService } from '/auth/users/users.service';
import { Session } from '/entities/session.entity';
import { User } from '/entities/user.entity';
import { CreateSessionInput } from './inputs/create-sessions.input';
import { CustomGetSessionGoogleOAuth } from './inputs/custom-get-session-google-oauth.input';

@Resolver(() => Session)
export class SessionsResolver {
  constructor(
    @Inject(SessionsService) private readonly sessionsService: SessionsService,
    @Inject(UsersService) private readonly usersService: UsersService,
  ) {}

  @ResolveField(() => User)
  async user(@Parent() session: Session) {
    const { userId } = session;
    return this.usersService.findOne({ id: userId });
  }

  @Query(() => String)
  async customGetSessionGoogleOAuthUrl() {
    return this.sessionsService.getGoogleOAuthUrl();
  }

  @Mutation(() => Session, { nullable: true })
  async customGetSessionGoogleOAuth(
    @Args('customGetSessionGoogleOAuthData', {
      type: () => CustomGetSessionGoogleOAuth,
    })
    customGetSessionGoogleOAuthData: CustomGetSessionGoogleOAuth,
  ) {
    return this.sessionsService.getSessionFromGoogleCallback(
      customGetSessionGoogleOAuthData,
    );
  }

  @Query(() => Session, { nullable: true })
  @UseGuards(AuthGuard)
  async session(@Args('id') id: string, @CurrentUser() user: User) {
    return this.sessionsService.findOneForUser(id, user);
  }

  @Mutation(() => Session, { nullable: true })
  async createSession(
    @Args('createSessionData', { type: () => CreateSessionInput })
    createSessionData: CreateSessionInput,
  ) {
    return this.sessionsService.create(createSessionData);
  }

  @Mutation(() => Session, { nullable: true })
  @UseGuards(AuthGuard)
  async deleteSession(@Args('id') id: string, @CurrentUser() user: User) {
    return this.sessionsService.delete(id, user);
  }

  @Mutation(() => [Session])
  @UseGuards(AuthGuard)
  async batchDeleteSessions(
    @Args('id', { type: () => [String] }) id: string[],
    @CurrentUser() user: User,
  ) {
    return this.sessionsService.deleteMany(id, user);
  }
}
