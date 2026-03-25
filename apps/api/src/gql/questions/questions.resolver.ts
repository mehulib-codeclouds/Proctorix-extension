import { Inject, ParseUUIDPipe, UseGuards } from '@nestjs/common';
import { Args, Context, ID, Mutation, Query, Resolver } from '@nestjs/graphql';
import { AuthGuard } from '/auth/guards/auth.guard';
import { Question } from '/entities/question.entity';
import type { User } from '/entities/user.entity';

import { QuestionsService } from '/exam/questions/questions.service';
import { CreateQuestionInput } from './inputs/create-question.input';
import type { UpdateQuestionInput } from './inputs/update-question.input';

@Resolver(() => Question)
export class QuestionsResolver {
  constructor(
    @Inject(QuestionsService)
    private readonly questionsService: QuestionsService,
  ) {}

  private getUser(context: { req: { user: User } }) {
    return context.req.user;
  }

  //  CREATE

  @Mutation(() => Question)
  @UseGuards(AuthGuard)
  async createQuestion(
    @Args('input', { type: () => CreateQuestionInput })
    input: CreateQuestionInput,

    @Context() context: { req: { user: User } },
  ) {
    const user = this.getUser(context);

    return this.questionsService.createQuestion({
      text: input.text,
      type: input.type,
      marks: input.marks,
      durationMinutes: input.durationMinutes,
      examId: input.examId,
      userId: user.id,
      role: user.role,
    });
  }
  //  UPDATE

  @Mutation(() => Question)
  @UseGuards(AuthGuard)
  async updateQuestion(
    @Args('input') input: UpdateQuestionInput,
    @Context() context: { req: { user: User } },
  ) {
    const user = this.getUser(context);
    return this.questionsService.updateQuestion({
      id: input.id,
      text: input.text,
      marks: input.marks,
      durationMinutes: input.durationMinutes,
      userId: user.id,
      role: user.role,
    });
  }

  //  READ ONE

  @Query(() => Question)
  async question(
    @Args('id', { type: () => ID }, ParseUUIDPipe)
    id: string,

    @Context() context: { req: { user: User } },
  ) {
    const user = this.getUser(context);

    return this.questionsService.getQuestionById({
      id,
      userId: user.id,
      role: user.role,
    });
  }

  //  READ MANY

  @Query(() => [Question])
  @UseGuards(AuthGuard)
  async questions(
    @Args('examId', { type: () => ID }, ParseUUIDPipe)
    examId: string,

    @Context() context: { req: { user: User } },
  ) {
    const user = this.getUser(context);

    return this.questionsService.getQuestions({
      examId,
      userId: user.id,
      role: user.role,
    });
  }

  //  DELETE ONE

  @Mutation(() => String)
  @UseGuards(AuthGuard)
  async deleteQuestion(
    @Args('id', { type: () => ID }, ParseUUIDPipe)
    id: string,

    @Context() context: { req: { user: User } },
  ) {
    const user = this.getUser(context);

    return this.questionsService.deleteQuestion({
      id,
      userId: user.id,
      role: user.role,
    });
  }

  // DELETE MANY

  @Mutation(() => Boolean)
  @UseGuards(AuthGuard)
  async deleteManyQuestions(
    @Args({ name: 'ids', type: () => [ID] })
    ids: string[],

    @Context() context: { req: { user: User } },
  ) {
    const user = this.getUser(context);

    return this.questionsService.deleteManyQuestions({
      ids,
      userId: user.id,
      role: user.role,
    });
  }
}
