import type { Session } from '/entities/session.entity';
import type { User } from '/entities/user.entity';

declare module 'fastify' {
  interface FastifyRequest {
    session?: Session;
    user?: User;
  }
}
