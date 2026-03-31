import { Inject, UseGuards } from '@nestjs/common';
import {
  Args,
  Context,
  Mutation,
  Parent,
  Query,
  ResolveField,
  Resolver,
} from '@nestjs/graphql';
import { AuthGuard } from '/auth/guards/auth.guard';
import { MsqAnswer } from '/entities/msq-answer.entity';
import { MsqOption } from '/entities/msq-option.entity';
import type { User } from '/entities/user.entity';
import { MSQAnswerService } from '/exam/answers/msq-answer.service';
import { Question } from '../../entities/question.entity';
import { CreateMSQAnswerInput } from './inputs/create-msq-answer';
import { UpdateMSQAnswerInput } from './inputs/update-msq-answer';
import { QuestionsService } from '/exam/questions/questions.service';

@Resolver(() => MsqAnswer)
export class MSQAnswersResolver {
  constructor(
    @Inject(MSQAnswerService)
    private readonly msqAnswerService: MSQAnswerService,
    @Inject(QuestionsService)
    private readonly questionService: QuestionsService
  ) {}

  //Mutations
  @Mutation(() => [MsqAnswer])
  @UseGuards(AuthGuard)
  async createMsqAnswer(
    @Args('createMSQAnswerData') createMSQAnswerData: CreateMSQAnswerInput,
    @Context() context: { req: { user: User } },
  ): Promise<MsqAnswer[]> {
    const user = context.req.user;
    return this.msqAnswerService.CreateMSQAnswer({
      questionId: createMSQAnswerData.questionId,
      optionIds: createMSQAnswerData.optionIds,
      userId: user.id,
      role: user.role,
    });
  }

  @Mutation(() => [MsqAnswer])
  @UseGuards(AuthGuard)
  async updateMsqAnswer(
    @Args('updateMSQAnswerData') updateMSQAnswerData: UpdateMSQAnswerInput,
    @Context() context: { req: { user: User } },
  ): Promise<MsqAnswer[]> {
    const user = context.req.user;
    return this.msqAnswerService.updateMSQAnswer({
      questionId: updateMSQAnswerData.questionId,
      optionIds: updateMSQAnswerData.optionIds,
      userId: user.id,
      role: user.role,
    });
  }

  @Mutation(() => Boolean)
  @UseGuards(AuthGuard)
  async deleteMsqAnswer(
    @Args('questionId') questionId: string,
    @Context() context: { req: { user: User } },
  ): Promise<boolean> {
    const user = context.req.user;
    return this.msqAnswerService.deleteMSQAnswer({
      questionId,
      userId: user.id,
      role: user.role,
    });
  }

  //Queries
  @Query(() => [MsqAnswer], { nullable: true })
  @UseGuards(AuthGuard)
  async getMsqAnswer(
    @Args('questionId') questionId: string,
    @Context() context: { req: { user: User } },
  ): Promise<MsqAnswer[]> {
    const user = context.req.user;
    return this.msqAnswerService.getMSQAnswer({
      questionId,
      userId: user.id,
      role: user.role,
    });
  }

  //Resolve fields
  @ResolveField(() => Question)
  Question(@Parent() msqAnswer: MsqAnswer) {
    return this.questionService.getQuestions(msqAnswer.questionId);
  }

  @ResolveField(() => MsqOption)
  async MsqOption(@Parent() msqAnswer: MsqAnswer): Promise<MsqOption> {
    return this.msqAnswerService.getMsqOption(msqAnswer.optionId);
  }
}
