import { Inject, UseGuards } from '@nestjs/common';
import { Args, Context, ID, Mutation, Query, Resolver } from '@nestjs/graphql';
import { AuthGuard } from '/auth/guards/auth.guard';
import type { User } from '/entities/user.entity';
import { Exam } from '../../entities/exam.entity';
import { ExamsService } from '../../exam/exams/exams.service';


import { CreateExamInput } from './input/CreateExamInput';
import { DeleteManyExamsInput } from './input/DeleteManyExamInput';
import { UpdateExamInput } from './input/UpdateExamInput';


@Resolver(() => Exam)
export class ExamsResolver {
  constructor(
    @Inject(ExamsService) private readonly examsService: ExamsService,
  ) {}




  @Query(() => [Exam])
  @UseGuards(AuthGuard)
async exams(
 @Context() context: { req: { user: User } },
): Promise<Exam[]> {


 const user = context.req.user;


    return this.examsService.getExams({
      userId: user.id,
      role: user.role,
    });
  }






  @Query(() => Exam)
  @UseGuards(AuthGuard)
  async getExamById(
    @Args('id', { type: () => ID }) id: string,
    @Context() context: { req: { user: User } },
  ): Promise<Exam> {


 const user = context.req.user;


    return this.examsService.getExamById({
      id,
      userId: user.id,
      role: user.role,
    });
  }














  @Mutation(() => Exam)
  @UseGuards(AuthGuard)
  async createExam(
    @Args('input', { type: () => CreateExamInput }) input: CreateExamInput,
    @Context() context: { req: { user: User } },
  ): Promise<Exam> {
   const user = context.req.user;


    return this.examsService.createExam({
      title: input.title,
      description: input.description,
      durationMinutes: input.durationMinutes,
      startTime: input.startTime,
      endTime: input.endTime,
      passingMarks: input.passingMarks,
      attemptsAllowed: input.attemptsAllowed,
      userId: user.id,
      role: user.role,
    });
  }


  @Mutation(() => Exam)
  @UseGuards(AuthGuard)
  async updateExam(
    @Args('id', { type: () => ID }) id: string,
    @Args('input', { type: () => UpdateExamInput }) input: UpdateExamInput,
    @Context() context: { req: { user: User } },
  ): Promise<Exam> {
   const user = context.req.user;


    return this.examsService.updateExam({
      id,
      title: input.title,
      description: input.description,
      durationMinutes: input.durationMinutes,
      startTime: input.startTime,
      endTime: input.endTime,
      passingMarks: input.passingMarks,
      attemptsAllowed: input.attemptsAllowed,
      userId: user.id,
      role: user.role,
    });
  }


  @Mutation(() => Boolean)
  @UseGuards(AuthGuard)
  async deleteExam(
    @Args('id', { type: () => ID }) id: string,
    @Context() context: { req: { user: User } },
  ): Promise<boolean> {
    const user = context.req.user;


    return this.examsService.deleteExam({
      id,
      userId: user.id,
      role: user.role,
    });
  }


  @Mutation(() => Boolean)
  @UseGuards(AuthGuard)
  async deleteManyExams(
    @Args('input', { type: () => DeleteManyExamsInput })
    input: DeleteManyExamsInput,


    @Context() context: { req: { user: User } },
  ): Promise<boolean> {
    const user = context.req.user;


    return this.examsService.deleteManyExams({
      ids: input.ids,
      userId: user.id,
      role: user.role,
    });
  }
}



