import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, QueryFailedError, Repository } from 'typeorm';
import { McqAnswer } from '/entities/mcq-answer.entity';
import { McqOption } from '/entities/mcq-option.entity';
import { MsqAnswer } from '/entities/msq-answer.entity';
import { MsqOption } from '/entities/msq-option.entity';
import { Question, QuestionType } from '/entities/question.entity';
import { UserRole } from '/entities/user.entity';
import { ExamsService } from '/exam/exams/exams.service';
import type { CreateMcqQuestionInput } from '/gql/questions/inputs/create-mcq-question.input';
import type { CreateMsqQuestionInput } from '/gql/questions/inputs/create-msq-question.input';
import type { UpdateMcqQuestionInput } from '/gql/questions/inputs/update-mcq-question.input';
import type { UpdateMsqQuestionInput } from '/gql/questions/inputs/update-msq-question.input';

@Injectable()
export class QuestionsService {
  constructor(
    @InjectRepository(Question)
    private readonly questionsRepo: Repository<Question>,

    private readonly dataSource: DataSource,

    private readonly examsService: ExamsService,
  ) {}

  //helpers

  private async getQuestion(id: string, manager?: EntityManager) {
  const repo = manager
    ? manager.getRepository(Question)
    : this.questionsRepo;

  return repo.findOne({
    where: { id },
    relations: {
      exam: true,
      mcqOptions: true,
      mcqAnswer: true,
      msqOptions: true,
      msqAnswers: true,
    },
  });
}

  private async checkWritable(examId: string, userId: string, role: UserRole) {
    const exam = await this.examsService.getExamById({
      id: examId,
      userId,
      role,
    });

    if (new Date() >= new Date(exam.startTime)) {
      throw new BadRequestException('Cannot modify questions after exam start');
    }

    return exam;
  }

  private checkExaminer(role: UserRole) {
    if (![UserRole.ADMIN, UserRole.EXAMINER].includes(role)) {
      throw new ForbiddenException();
    }
  }

  //CREATE

  async createMcqQuestion(
    input: CreateMcqQuestionInput,
    userId: string,
    role: UserRole,
  ) {
    this.checkExaminer(role);

    const {
      text,
      durationMinutes,
      marks,
      examId,
      options,
      correctOptionIndex,
    } = input;

    await this.checkWritable(examId, userId, role);

    return this.dataSource.transaction(async (m) => {
      const question = await m.save(
        Question,
        m.create(Question, {
          text,
          type: QuestionType.MCQ,
          durationMinutes,
          marks,
          exam: { id: examId },
        }),
      );

      const savedOptions = await m.save(
        McqOption,
        options.map((o) =>
          m.create(McqOption, {
            text: o.text,
            question: { id: question.id },
          }),
        ),
      );

      await m.save(
        McqAnswer,
        m.create(McqAnswer, {
          question: { id: question.id },
          option: { id: savedOptions[correctOptionIndex].id },
        }),
      );

      return this.getQuestion(question.id, m);
    });
  }

  async createMsqQuestion(
    input: CreateMsqQuestionInput,
    userId: string,
    role: UserRole,
  ) {
    this.checkExaminer(role);

    const {
      text,
      durationMinutes,
      marks,
      examId,
      options,
      correctOptionIndices,
    } = input;

    await this.checkWritable(examId, userId, role);

    return this.dataSource.transaction(async (m) => {
      const question = await m.save(
        Question,
        m.create(Question, {
          text,
          type: QuestionType.MSQ,
          durationMinutes,
          marks,
          exam: { id: examId },
        }),
      );

      const savedOptions = await m.save(
        MsqOption,
        options.map((o) =>
          m.create(MsqOption, {
            text: o.text,
            hasPartialMarking: o.hasPartialMarking,
            question: { id: question.id },
          }),
        ),
      );

      await m.save(
        MsqAnswer,
        correctOptionIndices.map((i) =>
          m.create(MsqAnswer, {
            question: { id: question.id },
            option: { id: savedOptions[i].id },
          }),
        ),
      );

      return this.getQuestion(question.id, m);
    });
  }

  //READ

  async findOne(id: string, withAnswer = false) {
    return this.questionsRepo.findOne({
      where: { id },
      relations: {
        mcqOptions: true,
        msqOptions: true,
        ...(withAnswer && {
          mcqAnswer: true,
          msqAnswers: true,
        }),
      },
    });
  }

  async findManyByExam(
    examId: string,
    userId: string,
    role: UserRole,
    withAnswer = false,
  ) {
    await this.examsService.getExamById({
      id: examId,
      userId,
      role,
    });

    return this.questionsRepo.find({
      where: {
        exam: { id: examId },
      },
      relations: {
        mcqOptions: true,
        msqOptions: true,
        ...(withAnswer && {
          mcqAnswer: true,
          msqAnswers: true,
        }),
      },
      order: { createdAt: 'ASC' },
    });
  }

  //UPDATE

  async updateMcqQuestion(
    input: UpdateMcqQuestionInput,
    userId: string,
    role: UserRole,
  ) {
    const question = await this.getQuestion(input.id);

    if (!question) throw new NotFoundException();

    await this.checkWritable(question.exam.id, userId, role);

    if (input.text !== undefined) question.text = input.text;

    if (input.marks !== undefined) question.marks = input.marks;

    if (input.durationMinutes !== undefined)
      question.durationMinutes = input.durationMinutes;

    return this.questionsRepo.save(question);
  }

  async updateMsqQuestion(
    input: UpdateMsqQuestionInput,
    userId: string,
    role: UserRole,
  ) {
    const question = await this.getQuestion(input.id);

    if (!question) throw new NotFoundException();

    await this.checkWritable(question.exam.id, userId, role);

    if (input.text !== undefined) question.text = input.text;

    if (input.marks !== undefined) question.marks = input.marks;

    if (input.durationMinutes !== undefined)
      question.durationMinutes = input.durationMinutes;

    return this.questionsRepo.save(question);
  }

  //DELETE
  async deleteQuestion(id: string, userId: string, role: UserRole) {
    const question = await this.getQuestion(id);

    if (!question) throw new NotFoundException();

    await this.checkWritable(question.examId, userId, role);

    await this.questionsRepo.delete(id);

    return id;
  }
}
