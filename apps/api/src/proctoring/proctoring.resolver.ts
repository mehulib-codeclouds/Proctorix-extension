import { Resolver, Query, Args, ID } from '@nestjs/graphql';
import { UseGuards, Inject } from '@nestjs/common';
import { AuthGuard } from '../auth/guards/auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '../entities/user.entity';
import { ProctorEvent } from '../entities/proctor-event.entity';
import { ProctoringService } from './proctoring.service';
import { ObjectType, Field, Int } from '@nestjs/graphql';

@ObjectType()
class ProctoringEventCount {
  @Field() eventType: string;
  @Field(() => Int) count: number;
}

@ObjectType()
class ProctoringAttemptSummary {
  @Field() attemptId: string;
  @Field(() => Int) totalEvents: number;
}

@Resolver()
export class ProctoringResolver {
  constructor(
    @Inject(ProctoringService) private readonly proctoringService: ProctoringService,
  ) {}

  @Query(() => [ProctorEvent])
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.EXAMINER)
  async proctoringEvents(
    @Args('attemptId', { type: () => ID }) attemptId: string,
  ): Promise<ProctorEvent[]> {
    return this.proctoringService.getEventsForAttempt(attemptId);
  }
}