/** biome-ignore-all lint/style/useImportType: <explanation> */
import { Inject, ParseUUIDPipe, UseGuards } from '@nestjs/common';
import { Args, Context, ID, Mutation, Query, Resolver } from '@nestjs/graphql';
import { AuthGuard } from '/auth/guards/auth.guard';
import { Question } from '/entities/question.entity';
import { UserRole, type User } from '/entities/user.entity';

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

  // DEV USER (temporary until session implemented)
// private devUser = {
//   id: 'a9160128-5427-4d72-8485-52febbbef6c7',
//   role: UserRole.ADMIN,
// };

  //  helpers 

  private getUser(
    context: { req: { user: User } },
  ) {
    return context.req.user;
  }
//   private getUser(
//   context: { req?: { user?: User } },
// ) {
//   return context?.req?.user ?? this.devUser;
// }

  //  CREATE 

  @Mutation(() => Question)
  @UseGuards(AuthGuard)
  async createMcqQuestion(
    @Args('input') input: CreateMcqQuestionInput,
    @Context() ctx: { req: { user: User } },
  ) {
    const user = this.getUser(ctx);

    return this.questionsService.createMcqQuestion(
      input,
      user.id,
      user.role,
    );
  }

  @Mutation(() => Question)
  @UseGuards(AuthGuard)
  async createMsqQuestion(
    @Args('input') input: CreateMsqQuestionInput,
    @Context() ctx: { req: { user: User } },
  ) {
    const user = this.getUser(ctx);

    return this.questionsService.createMsqQuestion(
      input,
      user.id,
      user.role,
    );
  }

  //  UPDATE 

  @Mutation(() => Question)
  @UseGuards(AuthGuard)
  async updateMcqQuestion(
    @Args('input') input: UpdateMcqQuestionInput,
    @Context() ctx: { req: { user: User } },
  ) {
    const user = this.getUser(ctx);

    return this.questionsService.updateMcqQuestion(
      input,
      user.id,
      user.role,
    );
  }

  @Mutation(() => Question)
  @UseGuards(AuthGuard)
  async updateMsqQuestion(
    @Args('input') input: UpdateMsqQuestionInput,
    @Context() ctx: { req: { user: User } },
  ) {
    const user = this.getUser(ctx);

    return this.questionsService.updateMsqQuestion(
      input,
      user.id,
      user.role,
    );
  }

  //  DELETE 

  @Mutation(() => String)
  @UseGuards(AuthGuard)
  async deleteQuestion(
    @Args('id', { type: () => ID }, ParseUUIDPipe)
    id: string,

    @Context() ctx: { req: { user: User } },
  ) {
    const user = this.getUser(ctx);

    return this.questionsService.deleteQuestion(
      id,
      user.id,
      user.role,
    );
  }

  //  READ ONE 

  @Query(() => Question)
  async question(
    @Args('id', { type: () => ID }, ParseUUIDPipe)
    id: string,

    @Args('withAnswer', {
      type: () => Boolean,
      nullable: true,
    })
    withAnswer?: boolean,
  ) {
    return this.questionsService.findOne(
      id,
      withAnswer ?? false,
    );
  }

  //  READ MANY 

  @Query(() => [Question])
  @UseGuards(AuthGuard)
  async examQuestions(
    @Args('examId', { type: () => ID }, ParseUUIDPipe)
    examId: string,

    @Context() ctx: { req: { user: User } },

    @Args('withAnswer', {
      type: () => Boolean,
      nullable: true,
    })
    withAnswer?: boolean,
    
  ) {
    const user = this.getUser(ctx);

    return this.questionsService.findManyByExam(
      examId,
      user.id,
      user.role,
      withAnswer,
    );
  }
}