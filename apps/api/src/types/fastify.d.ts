import type { Session } from '/entities/session.entity';

declare module 'fastify' {
  interface FastifyRequest {
    session?: Session;
    user?: User;
  }
}
