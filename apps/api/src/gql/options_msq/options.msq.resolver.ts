import { Inject, ParseUUIDPipe, UseGuards } from '@nestjs/common';
import { Args, Context, ID, Mutation, Query, Resolver } from '@nestjs/graphql';
import { AuthGuard } from '../../auth/guards/auth.guard';
import { MsqOption } from '../../entities/msq-option.entity';
import type { User } from '../../entities/user.entity';
import { OptionsService } from '../../exam/options_msq/options.msq.service';
import type { CreateMsqOptionInput } from './inputs/create-msq-option.input';
import type { UpdateMsqOptionInput } from './inputs/update-msq-option.input';

@Resolver()
export class OptionsResolver {
  constructor(
    @Inject(OptionsService)
    private readonly optionsService: OptionsService,
  ) {}

  private getUser(context: { req: { user: User } }) {
    return context.req.user;
  }

  @Query(() => [MsqOption])
  @UseGuards(AuthGuard)
  async msqOptions(
    @Args('questionId', { type: () => ID }, ParseUUIDPipe) questionId: string,
  ) {
    return this.optionsService.getMsqOptions(questionId);
  }

  @Mutation(() => MsqOption)
  @UseGuards(AuthGuard)
  async createMsqOption(
    @Args('input') input: CreateMsqOptionInput,
    @Context() context: { req: { user: User } },
  ) {
    const user = this.getUser(context);
    return this.optionsService.createMsqOption({
      text: input.text,
      hasPartialMarking: input.hasPartialMarking,
      questionId: input.questionId,
      userId: user.id,
      role: user.role,
    });
  }

  @Mutation(() => MsqOption)
  @UseGuards(AuthGuard)
  async updateMsqOption(
    @Args('input') input: UpdateMsqOptionInput,
    @Context() context: { req: { user: User } },
  ) {
    const user = this.getUser(context);
    return this.optionsService.updateMsqOption({
      id: input.id,
      text: input.text,
      hasPartialMarking: input.hasPartialMarking,
      userId: user.id,
      role: user.role,
    });
  }

  @Mutation(() => Boolean)
  @UseGuards(AuthGuard)
  async deleteMsqOption(
    @Args('id', { type: () => ID }, ParseUUIDPipe) id: string,
    @Context() context: { req: { user: User } },
  ) {
    const user = this.getUser(context);
    return this.optionsService.deleteMsqOption({
      id,
      userId: user.id,
      role: user.role,
    });
  }
}
