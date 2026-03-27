import { Inject, ParseUUIDPipe, UseGuards } from '@nestjs/common';
import { Args, Context, ID, Mutation, Query, Resolver } from '@nestjs/graphql';
import { AuthGuard } from '../../auth/guards/auth.guard';
import { McqOption } from '../../entities/mcq-option.entity';
import type { User } from '../../entities/user.entity';
import { OptionsService } from '../../exam/options_mcq/options.mcq.service';
import type { CreateMcqOptionInput } from './inputs/create-mcq-option.input';
import type { UpdateMcqOptionInput } from './inputs/update-mcq-option.input';

@Resolver()
export class OptionsResolver {
  constructor(
    @Inject(OptionsService)
    private readonly optionsService: OptionsService,
  ) {}

  private getUser(context: { req: { user: User } }) {
    return context.req.user;
  }

  @Query(() => [McqOption])
  @UseGuards(AuthGuard)
  async mcqOptions(
    @Args('questionId', { type: () => ID }, ParseUUIDPipe) questionId: string,
  ) {
    return this.optionsService.getMcqOptions(questionId);
  }

  @Mutation(() => McqOption)
  @UseGuards(AuthGuard)
  async createMcqOption(
    @Args('input') input: CreateMcqOptionInput,
    @Context() context: { req: { user: User } },
  ) {
    const user = this.getUser(context);
    return this.optionsService.createMcqOption({
      text: input.text,
      questionId: input.questionId,
      userId: user.id,
      role: user.role,
    });
  }

  @Mutation(() => McqOption)
  @UseGuards(AuthGuard)
  async updateMcqOption(
    @Args('input') input: UpdateMcqOptionInput,
    @Context() context: { req: { user: User } },
  ) {
    const user = this.getUser(context);
    return this.optionsService.updateMcqOption({
      id: input.id,
      text: input.text,
      userId: user.id,
      role: user.role,
    });
  }

  @Mutation(() => Boolean)
  @UseGuards(AuthGuard)
  async deleteMcqOption(
    @Args('id', { type: () => ID }, ParseUUIDPipe) id: string,
    @Context() context: { req: { user: User } },
  ) {
    const user = this.getUser(context);
    return this.optionsService.deleteMcqOption({
      id,
      userId: user.id,
      role: user.role,
    });
  }
}
