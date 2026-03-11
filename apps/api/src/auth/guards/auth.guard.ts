import {
  type CanActivate,
  type ExecutionContext,
  Inject,
  Injectable,
} from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import type { FastifyRequest } from 'fastify';
import { UsersService } from '../users/users.service';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    @Inject(UsersService) private readonly usersService: UsersService,
    // TODO: INJECT SESSIONS SERVICE
    // @Inject(SessionsService) private readonly sessionsService: SessionsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const gqlExecutionContext = GqlExecutionContext.create(context);

    const { req } = gqlExecutionContext.getContext<{ req: FastifyRequest }>();

    // CHECK IF THE AUTHORIZATION TOKEN EVEN EXISTS
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return false;
    }

    // CHECK IF THE AUTH TOKEN EXISTS IN THE CORRECT FORMAT
    const parts = authHeader.split(' ');
    if (parts.length !== 2) {
      return false;
    }

    const [type, token] = parts;

    // CHECK IF THE SENT TOKEN IS A BEARER TOKEN, AND THE SENT TOKEN IS AN ACTUAL TOKEN
    if (type !== 'Bearer' || !token) {
      return false;
    }

    // TODO: CHECK IF THE TOKEN EXISTS IN THE SESSIONS TABLE, IF YES, SESSION IS VALID
    // const session = await sessionsService.findOne(token);
    // if (!session) {
    //     return false;
    // }

    // TODO: UPDATE THE SESSIONS TABLE (IF > 5 MIN)
    // if (!session.lastUsedAt || Date.now() - session.lastUsedAt.getTime() > 5 * 60 * 60) {
    //     await this.sessionsService.update({
    //         id: session.id,
    //         lastUsedAt: new Date(),
    //     });
    // }

    // TODO: FIND THE ACTUAL USER AGAINST THE TOKEN
    // const user = await this.usersService.findOne({ id: session.userId });
    // if (!user) {
    //     return false;
    // }

    // TODO: ASSIGN THE SESSION AND USER OBJECT (IF FOUND) TO THE REQUEST AND GO NEXT
    // req.session = session;
    // req.user = user;

    return true;
  }
}
