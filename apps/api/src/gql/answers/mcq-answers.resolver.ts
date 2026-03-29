import { Inject, UseGuards } from '@nestjs/common';
import {
  Args,
  Context,
  ID,
  Mutation,
  Parent,
  Query,
  ResolveField,
  Resolver,
} from '@nestjs/graphql';
import { AuthGuard } from '/auth/guards/auth.guard';
import { McqAnswer } from '/entities/mcq-answer.entity';
import { McqOption } from '/entities/mcq-option.entity';
import { Question } from '/entities/question.entity';
import type { User } from '/entities/user.entity';
import { MCQAnswerService } from '/exam/answers/mcq-answer.service';
import { CreateMCQAnswerInput } from './inputs/create-mcq-answer';
import { UpdateMCQAnswerInput } from './inputs/update-mcq-answer';

@Resolver(() => McqAnswer)
export class MCQAnswersResolver {
  constructor(
    @Inject(MCQAnswerService)
    private readonly mcqAnswerService: MCQAnswerService,
  ) {}

  //   Mutations
  @Mutation(() => McqAnswer)
  @UseGuards(AuthGuard)
  createMcqAnswer(
    @Args('createMCQAnswerData', { type: () => CreateMCQAnswerInput })
    createMCQAnswerData: CreateMCQAnswerInput,
    @Context() context: { req: { user: User } },
  ): Promise<McqAnswer> {
    const user = context.req.user;
    return this.mcqAnswerService.CreateMCQAnswer({
      questionId: createMCQAnswerData.questionId,
      optionId: createMCQAnswerData.optionId,
      userId: user.id,
      role: user.role,
    });
  }

  @Mutation(() => McqAnswer)
  @UseGuards(AuthGuard)
  updateMcqAnswer(
    @Args('updateMCQAnswerData', { type: () => UpdateMCQAnswerInput })
    updateMCQAnswerData: UpdateMCQAnswerInput,
    @Context() context: { req: { user: User } },
  ): Promise<McqAnswer> {
    const user = context.req.user;
    return this.mcqAnswerService.updateMCQAnswer({
      questionId: updateMCQAnswerData.questionId,
      optionId: updateMCQAnswerData.optionId,
      userId: user.id,
      role: user.role,
    });
  }

  @Mutation(() => Boolean)
  @UseGuards(AuthGuard)
  async deleteMcqAnswer(
    @Args('questionId', { type: () => ID }) questionId: string,
    @Context() context: { req: { user: User } },
  ): Promise<boolean> {
    const user = context.req.user;
    return this.mcqAnswerService.deleteMCQAnswer({
      questionId,
      userId: user.id,
      role: user.role,
    });
  }

  //Queries
  @Query(() => McqAnswer, { nullable: true })
  @UseGuards(AuthGuard)
  async getMcqAnswer(
    @Args('questionId', { type: () => ID }) questionId: string,
    @Context() context: { req: { user: User } },
  ): Promise<McqAnswer> {
    const user = context.req.user;
    return this.mcqAnswerService.getMCQAnswer({
      questionId,
      role: user.role,
    });
  }

  //Resolve fields
  @ResolveField(() => Question)
  async question(@Parent() mcqAnswer: McqAnswer): Promise<Question> {
    return this.questionService.getQuestion(mcqAnswer.questionId);
  }

  @ResolveField(() => McqOption)
  async option(@Parent() mcqAnswer: McqAnswer): Promise<McqOption> {
    return this.mcqAnswerService.getMcqOption(mcqAnswer.optionId);
  }
}
