/** biome-ignore-all lint/style/useImportType: <explanation> */
import { Inject, ParseUUIDPipe, UseGuards } from '@nestjs/common';
import { Args, Context, ID, Mutation, Query, Resolver } from '@nestjs/graphql';
import { AuthGuard } from '/auth/guards/auth.guard';
import { Question } from '/entities/question.entity';
import type { User } from '/entities/user.entity';

import { QuestionsService } from '/exam/questions/questions.service';

import { CreateMcqQuestionInput } from '/gql/questions/inputs/create-mcq-question.input';
import { CreateMsqQuestionInput } from '/gql/questions/inputs/create-msq-question.input';

import { UpdateMcqQuestionInput } from '/gql/questions/inputs/update-mcq-question.input';
import { UpdateMsqQuestionInput } from '/gql/questions/inputs/update-msq-question.input';

@Resolver(() => Question)
export class QuestionsResolver {
  constructor(
    @Inject(QuestionsService)
    private readonly questionsService: QuestionsService,
  ) {}

  // ─── MCQ Mutations ─────────────────────────

  @Mutation(() => Question)
  @UseGuards(AuthGuard)
  async createMcqQuestion(
    @Args('input') input: CreateMcqQuestionInput,
    @Context() context: { req: { user: User } },
  ): Promise<Question> {
    const user = context.req.user;

    return this.questionsService.createMcqQuestion(
      input,
      user.id,
      user.role,
    );
  }

  @Mutation(() => Question)
  @UseGuards(AuthGuard)
  async updateMcqQuestion(
    @Args('input') input: UpdateMcqQuestionInput,
    @Context() context: { req: { user: User } },
  ): Promise<Question> {
    const user = context.req.user;

    return this.questionsService.updateMcqQuestion(
      input,
      user.id,
      user.role,
    );
  }

  @Mutation(() => String)
  @UseGuards(AuthGuard)
  async deleteMcqQuestion(
    @Args('id', { type: () => ID }, new ParseUUIDPipe()) id: string,
    @Context() context: { req: { user: User } },
  ): Promise<string> {
    const user = context.req.user;

    return this.questionsService.deleteMcqQuestion(
      id,
      user.id,
      user.role,
    );
  }

  // ─── MSQ Mutations ─────────────────────────

  @Mutation(() => Question)
  @UseGuards(AuthGuard)
  async createMsqQuestion(
    @Args('input') input: CreateMsqQuestionInput,
    @Context() context: { req: { user: User } },
  ): Promise<Question> {
    const user = context.req.user;

    return this.questionsService.createMsqQuestion(
      input,
      user.id,
      user.role,
    );
  }

  @Mutation(() => Question)
  @UseGuards(AuthGuard)
  async updateMsqQuestion(
    @Args('input') input: UpdateMsqQuestionInput,
    @Context() context: { req: { user: User } },
  ): Promise<Question> {
    const user = context.req.user;

    return this.questionsService.updateMsqQuestion(
      input,
      user.id,
      user.role,
    );
  }

  @Mutation(() => String)
  @UseGuards(AuthGuard)
  async deleteMsqQuestion(
    @Args('id', { type: () => ID }, new ParseUUIDPipe()) id: string,
    @Context() context: { req: { user: User } },
  ): Promise<string> {
    const user = context.req.user;

    return this.questionsService.deleteMsqQuestion(
      id,
      user.id,
      user.role,
    );
  }

  // ─── MCQ Queries ─────────────────────────

  @Query(() => Question)
  async mcqQuestionForExaminer(
    @Args('id', { type: () => ID }, new ParseUUIDPipe()) id: string,
  ): Promise<Question> {
    return this.questionsService.findMcqQuestionWithAnswer(id);
  }

  @Query(() => Question)
  async mcqQuestionForAttempt(
    @Args('id', { type: () => ID }, new ParseUUIDPipe()) id: string,
  ): Promise<Question> {
    return this.questionsService.findMcqQuestionWithoutAnswer(id);
  }

  // ─── MSQ Queries ─────────────────────────

  @Query(() => Question)
  async msqQuestionForExaminer(
    @Args('id', { type: () => ID }, new ParseUUIDPipe()) id: string,
  ): Promise<Question> {
    return this.questionsService.findMsqQuestionWithAnswers(id);
  }

  @Query(() => Question)
  async msqQuestionForAttempt(
    @Args('id', { type: () => ID }, new ParseUUIDPipe()) id: string,
  ): Promise<Question> {
    return this.questionsService.findMsqQuestionWithoutAnswers(id);
  }

  // ─── Shared Queries ─────────────────────────

  @Query(() => [Question])
  @UseGuards(AuthGuard)
  async examQuestionsForExaminer(
    @Args('examId', { type: () => ID }, new ParseUUIDPipe()) examId: string,
    @Context() context: { req: { user: User } },
  ): Promise<Question[]> {
    const user = context.req.user;

    return this.questionsService.findAllByExamIdWithAnswers(
      examId,
      user.id,
      user.role,
    );
  }

  @Query(() => [Question])
  async examQuestionsForAttempt(
    @Args('examId', { type: () => ID }, new ParseUUIDPipe()) examId: string,
  ): Promise<Question[]> {
    return this.questionsService.findAllByExamIdWithoutAnswers(examId);
  }
}