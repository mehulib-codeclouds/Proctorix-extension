import type { CanActivate, ExecutionContext } from '@nestjs/common';
import type { Reflector } from '@nestjs/core';
import { GqlExecutionContext } from '@nestjs/graphql';
import type { FastifyRequest } from 'fastify';
import type { UserRole } from '/entities/user.entity';
import { ROLES_KEY } from '../decorators/roles.decorator';

export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const allowedRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!allowedRoles) {
      return true;
    }

    const gqlExecutionContext = GqlExecutionContext.create(context);

    const { req } = gqlExecutionContext.getContext<{ req: FastifyRequest }>();

    const user = req.user;
    if (!user) {
      return false;
    }

    if (!user.role || !allowedRoles.includes(user.role)) {
      return false;
    }

    return true;
  }
}
