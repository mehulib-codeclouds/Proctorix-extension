import { Inject } from '@nestjs/common';
import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql';
import { Exam } from '../../entities/exam.entity';
import { ExamsService } from '../../exam/exams/exams.service';
import { CreateExamInput } from './Input/CreateExamInput';
import { DeleteManyExamsInput } from './Input/DeleteManyExamInput';
import { UpdateExamInput } from './Input/UpdateExamInput';
import { UserContextInput } from './Input/UserContextInput';

@Resolver(() => Exam)
export class ExamsResolver {
  constructor(
    @Inject(ExamsService) private readonly examsService: ExamsService,
  ) {}

 @Query(() => [Exam])
async exams(
  @Args('user', { type: () => UserContextInput }) user: UserContextInput,

  @Args('limit', { type: () => Number, nullable: true }) limit?: number,

  @Args('offset', { type: () => Number, nullable: true }) offset?: number,
): Promise<Exam[]> {
  return this.examsService.getExams(user, limit, offset);
}

  @Query(() => Exam)
  async getExamById(
    @Args('id', { type: () => ID }) id: string,
    @Args('user', { type: () => UserContextInput }) user: UserContextInput,
  ): Promise<Exam> {
    return this.examsService.getExamById(id, user);
  }

  @Mutation(() => Exam)
  async createExam(
    @Args('input', { type: () => CreateExamInput }) input: CreateExamInput,
    @Args('user', { type: () => UserContextInput }) user: UserContextInput,
  ): Promise<Exam> {
    return this.examsService.createExam(input, user);
  }

  @Mutation(() => Exam)
  async updateExam(
    @Args('id', { type: () => ID }) id: string,
    @Args('input', { type: () => UpdateExamInput }) input: UpdateExamInput,
    @Args('user', { type: () => UserContextInput }) user: UserContextInput,
  ): Promise<Exam> {
    return this.examsService.updateExam(id, input, user);
  }

  @Mutation(() => Boolean)
  async deleteExam(
    @Args('id', { type: () => ID }) id: string,
    @Args('user', { type: () => UserContextInput }) user: UserContextInput,
  ): Promise<boolean> {
    return this.examsService.deleteExam(id, user);
  }

 @Mutation(() => Boolean)
async deleteManyExams(
  @Args('input', { type: () => DeleteManyExamsInput })
  input: DeleteManyExamsInput,

  @Args('user', { type: () => UserContextInput })
  user: UserContextInput,
): Promise<boolean> {
  return this.examsService.deleteManyExams(input.ids, user);
}
}
