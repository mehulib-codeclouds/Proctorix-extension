import {
  type CanActivate,
  type ExecutionContext,
  Inject,
  Injectable,
} from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import type { FastifyRequest } from 'fastify';
import { SessionsService } from '../sessions/sessions.service';
import { UsersService } from '../users/users.service';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    @Inject(UsersService) private readonly usersService: UsersService,

    @Inject(SessionsService) private readonly sessionsService: SessionsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const gqlExecutionContext = GqlExecutionContext.create(context);

    const { req } = gqlExecutionContext.getContext<{ req: FastifyRequest }>();

    const authHeader = req.headers.authorization;
    if (!authHeader) return false;

    const parts = authHeader.split(' ');
    if (parts.length !== 2) return false;

    const [type, token] = parts;

    if (type !== 'Bearer' || !token) return false;

    const session = await this.sessionsService.findOne(token);
    if (!session) return false;

    if (
      !session.lastUsedAt ||
      Date.now() - session.lastUsedAt.getTime() > 5 * 60 * 60 * 60
    ) {
      await this.sessionsService.update({
        id: session.id,
        lastUsedAt: new Date(),
      });
    }

    const user = await this.usersService.findOne({ id: session.userId });
    if (!user) return false;

    req.session = session;
    req.user = user;

    return true;
  }
}
