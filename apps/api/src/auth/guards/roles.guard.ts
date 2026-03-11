import type { CanActivate, ExecutionContext } from '@nestjs/common';
import type { Reflector } from '@nestjs/core';
import { GqlExecutionContext } from '@nestjs/graphql';
import type { FastifyRequest } from 'fastify';
import type { UserRole } from '/entities/user.entity';
import { ROLES_KEY } from '../decorators/roles.decorator';

export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // CHECK IF ROLES IS ACTIALLY PASSED, LOOK FOR ROLES FROM METHOD AND CLASS BOTH, OVERRIDE IF NEEDED
    const allowedRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // IF ROLES IS NOT PASSED AT ALL, ALLOW ACCESS
    if (!allowedRoles) {
      return true;
    }

    const gqlExecutionContext = GqlExecutionContext.create(context);

    const { req } = gqlExecutionContext.getContext<{ req: FastifyRequest }>();

    // RETRIEVE THE USER OBJECT FROM THE REQUEST
    const user = req.user;
    if (!user) {
      return false;
    }

    // CHECK IF THE ROLE EXISTS, AND HAS SUFFICIENT PERMISSIONS
    if (!user.role || !allowedRoles.includes(user.role)) {
      return false;
    }

    return true;
  }
}
