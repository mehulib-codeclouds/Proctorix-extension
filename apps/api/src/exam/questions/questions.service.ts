/** biome-ignore-all lint/style/useImportType: <explanation> */
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, QueryFailedError, Repository } from 'typeorm';
import { McqAnswer } from '/entities/mcq-answer.entity';
import { McqOption } from '/entities/mcq-option.entity';
import { MsqAnswer } from '/entities/msq-answer.entity';
import { MsqOption } from '/entities/msq-option.entity';
import { Question, QuestionType } from '/entities/question.entity';
import { UserRole } from '/entities/user.entity';
import  { ExamsService } from '/exam/exams/exams.service';
import type { CreateMcqQuestionInput } from '/gql/questions/inputs/create-mcq-question.input';
import type { CreateMsqQuestionInput } from '/gql/questions/inputs/create-msq-question.input';
import type { UpdateMcqQuestionInput } from '/gql/questions/inputs/update-mcq-question.input';
import type { UpdateMsqQuestionInput } from '/gql/questions/inputs/update-msq-question.input';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Validates that all correctOptionIndices are within bounds and unique.
 * Throws BadRequestException otherwise.
 */
function validateOptionIndices(indices: number[], optionsLength: number): void {
  for (const idx of indices) {
    if (idx < 0 || idx >= optionsLength) {
      throw new BadRequestException(
        `Option index ${idx} is out of range for ${optionsLength} options`,
      );
    }
  }
  if (new Set(indices).size !== indices.length) {
    throw new BadRequestException('Correct option indices must be unique');
  }
}

/**
 * Catches raw TypeORM/Postgres errors and rethrows as clean NestJS exceptions
 * so GraphQL clients never receive an opaque 500.
 */
function handleDbError(err: unknown): never {
  if (err instanceof QueryFailedError) {
    const pg = err as QueryFailedError & { code?: string; detail?: string };
    console.error('[QuestionsService] QueryFailedError code=%s detail=%s', pg.code, pg.detail);
    if (pg.code === '23503') {
      throw new BadRequestException(
        pg.detail ?? 'A referenced record does not exist',
      );
    }
    if (pg.code === '23505') {
      throw new BadRequestException(
        pg.detail ?? 'A unique constraint was violated',
      );
    }
  }
  console.error('[QuestionsService] Unhandled DB error:', err);
  throw new InternalServerErrorException(
    'An unexpected database error occurred',
  );
}

// ─── Service ──────────────────────────────────────────────────────────────────
 
@Injectable()
export class QuestionsService {
  constructor(
    @InjectRepository(Question)
    private readonly questionRepository: Repository<Question>,
 
    private readonly dataSource: DataSource,
 
    // Injected to validate exam existence, ownership, and started state.
    // ExamsModule must export ExamsService for this to work.
    private readonly examsService: ExamsService,
  ) {}
 
  // ─── Private guards ─────────────────────────────────────────────────────────
 
  /**
   * Uses ExamsService.getExamById which already handles:
   * - NotFoundException if exam doesn't exist
   * - ForbiddenException if the user doesn't own the exam (unless ADMIN)
   *
   * We add the "not started" check on top of that.
   */
  private async assertExamWritable(
    examId: string,
    userId: string,
    role: UserRole,
  ): Promise<void> {
    // Reuses existing ownership + existence check from the exam team
    const exam = await this.examsService.getExamById({ id: examId, userId, role });
 
    if (new Date() >= new Date(exam.startTime)) {
      throw new BadRequestException(
        'Cannot modify questions after the exam has started',
      );
    }
  }
 
  /**
   * Loads a question by id + type, asserts it exists, and checks that the
   * requesting user owns the parent exam (unless ADMIN).
   */
  private async assertQuestion(
    id: string,
    type: QuestionType,
    userId: string,
    role: UserRole,
  ): Promise<Question> {
    const question = await this.questionRepository.findOne({
      where: { id, type },
      relations: { exam: true },
    });
 
    if (!question) {
      throw new NotFoundException(
        `${type.toUpperCase()} question "${id}" not found`,
      );
    }
 
    // Delegates ownership + existence check to ExamsService
    if (role !== UserRole.ADMIN && question.exam.createdById !== userId) {
      throw new ForbiddenException(
        'You do not have permission to modify this question',
      );
    }
 
    return question;
  }
 
  // ─── Create ─────────────────────────────────────────────────────────────────
 
  async createMcqQuestion(
    input: CreateMcqQuestionInput,
    userId: string,
    role: UserRole,
  ): Promise<Question> {
    const { text, durationMinutes, marks, examId, options, correctOptionIndex } =
      input;
 
    // Validates: exam exists, user owns it, exam hasn't started
    if (![UserRole.ADMIN, UserRole.EXAMINER].includes(role)) {
      throw new ForbiddenException('You are not allowed to create questions');
    }
 
    validateOptionIndices([correctOptionIndex], options.length);
    await this.assertExamWritable(examId, userId, role);
 
    try {
      return await this.dataSource.transaction(async (manager) => {
        const question = manager.create(Question, {
          text,
          type: QuestionType.MCQ,
          durationMinutes: durationMinutes ?? null,
          marks,
          exam: { id: examId },
        });
        const savedQuestion = await manager.save(Question, question);
 
        const mcqOptions = options.map((opt) =>
          manager.create(McqOption, {
            text: opt.text,
            question: { id: savedQuestion.id },
          }),
        );
        const savedOptions = await manager.save(McqOption, mcqOptions);
 
        const mcqAnswer = manager.create(McqAnswer, {
          question: { id: savedQuestion.id },
          option: { id: savedOptions[correctOptionIndex].id },
        });
        await manager.save(McqAnswer, mcqAnswer);
 
        return manager.findOneOrFail(Question, {
          where: { id: savedQuestion.id },
          relations: { mcqOptions: true, mcqAnswer: true },
        });
      });
    } catch (err) {
      if (
        err instanceof BadRequestException ||
        err instanceof NotFoundException ||
        err instanceof ForbiddenException
      )
        throw err;
      handleDbError(err);
    }
  }
 
  async createMsqQuestion(
    input: CreateMsqQuestionInput,
    userId: string,
    role: UserRole,
  ): Promise<Question> {
    const { text, durationMinutes, marks, examId, options, correctOptionIndices } =
      input;
 
    if (![UserRole.ADMIN, UserRole.EXAMINER].includes(role)) {
      throw new ForbiddenException('You are not allowed to create questions');
    }
 
    validateOptionIndices(correctOptionIndices, options.length);
    await this.assertExamWritable(examId, userId, role);
 
    try {
      return await this.dataSource.transaction(async (manager) => {
        const question = manager.create(Question, {
          text,
          type: QuestionType.MSQ,
          durationMinutes: durationMinutes ?? null,
          marks,
          exam: { id: examId },
        });
        const savedQuestion = await manager.save(Question, question);
 
        const msqOptions = options.map((opt) =>
          manager.create(MsqOption, {
            text: opt.text,
            hasPartialMarking: opt.hasPartialMarking,
            question: { id: savedQuestion.id },
          }),
        );
        const savedOptions = await manager.save(MsqOption, msqOptions);
 
        const msqAnswers = correctOptionIndices.map((idx) =>
          manager.create(MsqAnswer, {
            question: { id: savedQuestion.id },
            option: { id: savedOptions[idx].id },
          }),
        );
        await manager.save(MsqAnswer, msqAnswers);
 
        return manager.findOneOrFail(Question, {
          where: { id: savedQuestion.id },
          relations: { msqOptions: true, msqAnswers: true },
        });
      });
    } catch (err) {
      if (
        err instanceof BadRequestException ||
        err instanceof NotFoundException ||
        err instanceof ForbiddenException
      )
        throw err;
      handleDbError(err);
    }
  }
 
  // ─── Read ────────────────────────────────────────────────────────────────────
 
  /** Examiner view — includes correct answer */
  async findMcqQuestionWithAnswer(id: string): Promise<Question> {
    const question = await this.questionRepository.findOne({
      where: { id, type: QuestionType.MCQ },
      relations: { mcqOptions: true, mcqAnswer: true },
    });
    if (!question)
      throw new NotFoundException(`MCQ question "${id}" not found`);
    return question;
  }
 
  /** Candidate view — options only, no answer */
  async findMcqQuestionWithoutAnswer(id: string): Promise<Question> {
    const question = await this.questionRepository.findOne({
      where: { id, type: QuestionType.MCQ },
      relations: { mcqOptions: true },
    });
    if (!question)
      throw new NotFoundException(`MCQ question "${id}" not found`);
    return question;
  }
 
  /** Examiner view — includes correct answers */
  async findMsqQuestionWithAnswers(id: string): Promise<Question> {
    const question = await this.questionRepository.findOne({
      where: { id, type: QuestionType.MSQ },
      relations: { msqOptions: true, msqAnswers: true },
    });
    if (!question)
      throw new NotFoundException(`MSQ question "${id}" not found`);
    return question;
  }
 
  /** Candidate view — options only, no answers */
  async findMsqQuestionWithoutAnswers(id: string): Promise<Question> {
    const question = await this.questionRepository.findOne({
      where: { id, type: QuestionType.MSQ },
      relations: { msqOptions: true },
    });
    if (!question)
      throw new NotFoundException(`MSQ question "${id}" not found`);
    return question;
  }
 
  /** Examiner view — all questions for an exam, with correct answers */
  async findAllByExamIdWithAnswers(
    examId: string,
    userId: string,
    role: UserRole,
  ): Promise<Question[]> {
    // Validates exam exists and user can access it
    await this.examsService.getExamById({ id: examId, userId, role });
 
    return this.questionRepository.find({
      where: { examId },
      relations: {
        mcqOptions: true,
        mcqAnswer: true,
        msqOptions: true,
        msqAnswers: true,
      },
      order: { createdAt: 'ASC' },
    });
  }
 
  /** Candidate view — all questions for an exam, without correct answers */
  async findAllByExamIdWithoutAnswers(examId: string): Promise<Question[]> {
    return this.questionRepository.find({
      where: { examId },
      relations: {
        mcqOptions: true,
        msqOptions: true,
      },
      order: { createdAt: 'ASC' },
    });
  }
 
  // ─── Update ──────────────────────────────────────────────────────────────────
 
  async updateMcqQuestion(
    input: UpdateMcqQuestionInput,
    userId: string,
    role: UserRole,
  ): Promise<Question> {
    const { id, text, durationMinutes, marks, options, correctOptionIndex } =
      input;
 
    const question = await this.assertQuestion(id, QuestionType.MCQ, userId, role);
    await this.assertExamWritable(question.examId, userId, role);
 
    if (correctOptionIndex !== undefined && options !== undefined) {
      validateOptionIndices([correctOptionIndex], options.length);
    }
 
    try {
      return await this.dataSource.transaction(async (manager) => {
        if (text !== undefined) question.text = text;
        if (durationMinutes !== undefined)
          question.durationMinutes = durationMinutes;
        if (marks !== undefined) question.marks = marks;
        await manager.save(Question, question);
 
        if (options !== undefined) {
          await manager.delete(McqOption, { question: { id } });
 
          const newOptions = options.map((opt) =>
            manager.create(McqOption, { text: opt.text, question: { id } }),
          );
          const savedOptions = await manager.save(McqOption, newOptions);
 
          if (correctOptionIndex !== undefined) {
            await manager.delete(McqAnswer, { question: { id } });
            await manager.save(
              McqAnswer,
              manager.create(McqAnswer, {
                question: { id },
                option: { id: savedOptions[correctOptionIndex].id },
              }),
            );
          }
        } else if (correctOptionIndex !== undefined) {
          const existingOptions = await manager.find(McqOption, {
            where: { question: { id } },
            order: { createdAt: 'ASC' },
          });
          validateOptionIndices([correctOptionIndex], existingOptions.length);
 
          await manager.delete(McqAnswer, { question: { id } });
          await manager.save(
            McqAnswer,
            manager.create(McqAnswer, {
              question: { id },
              option: { id: existingOptions[correctOptionIndex].id },
            }),
          );
        }
 
        return manager.findOneOrFail(Question, {
          where: { id },
          relations: { mcqOptions: true, mcqAnswer: true },
        });
      });
    } catch (err) {
      if (
        err instanceof BadRequestException ||
        err instanceof NotFoundException ||
        err instanceof ForbiddenException
      )
        throw err;
      handleDbError(err);
    }
  }
 
  async updateMsqQuestion(
    input: UpdateMsqQuestionInput,
    userId: string,
    role: UserRole,
  ): Promise<Question> {
    const { id, text, durationMinutes, marks, options, correctOptionIndices } =
      input;
 
    const question = await this.assertQuestion(id, QuestionType.MSQ, userId, role);
    await this.assertExamWritable(question.examId, userId, role);
 
    if (correctOptionIndices !== undefined && options !== undefined) {
      validateOptionIndices(correctOptionIndices, options.length);
    }
 
    try {
      return await this.dataSource.transaction(async (manager) => {
        if (text !== undefined) question.text = text;
        if (durationMinutes !== undefined)
          question.durationMinutes = durationMinutes;
        if (marks !== undefined) question.marks = marks;
        await manager.save(Question, question);
 
        if (options !== undefined) {
          await manager.delete(MsqOption, { question: { id } });
 
          const newOptions = options.map((opt) =>
            manager.create(MsqOption, {
              text: opt.text,
              hasPartialMarking: opt.hasPartialMarking,
              question: { id },
            }),
          );
          const savedOptions = await manager.save(MsqOption, newOptions);
 
          if (correctOptionIndices !== undefined) {
            await manager.delete(MsqAnswer, { question: { id } });
            const msqAnswers = correctOptionIndices.map((idx) =>
              manager.create(MsqAnswer, {
                question: { id },
                option: { id: savedOptions[idx].id },
              }),
            );
            await manager.save(MsqAnswer, msqAnswers);
          }
        } else if (correctOptionIndices !== undefined) {
          const existingOptions = await manager.find(MsqOption, {
            where: { question: { id } },
            order: { createdAt: 'ASC' },
          });
          validateOptionIndices(correctOptionIndices, existingOptions.length);
 
          await manager.delete(MsqAnswer, { question: { id } });
          const msqAnswers = correctOptionIndices.map((idx) =>
            manager.create(MsqAnswer, {
              question: { id },
              option: { id: existingOptions[idx].id },
            }),
          );
          await manager.save(MsqAnswer, msqAnswers);
        }
 
        return manager.findOneOrFail(Question, {
          where: { id },
          relations: { msqOptions: true, msqAnswers: true },
        });
      });
    } catch (err) {
      if (
        err instanceof BadRequestException ||
        err instanceof NotFoundException ||
        err instanceof ForbiddenException
      )
        throw err;
      handleDbError(err);
    }
  }
 
  // ─── Delete ──────────────────────────────────────────────────────────────────
 
  async deleteMcqQuestion(
    id: string,
    userId: string,
    role: UserRole,
  ): Promise<string> {
    const question = await this.assertQuestion(id, QuestionType.MCQ, userId, role);
    await this.assertExamWritable(question.examId, userId, role);
    await this.questionRepository.delete(id);
    return id;
  }
 
  async deleteMsqQuestion(
    id: string,
    userId: string,
    role: UserRole,
  ): Promise<string> {
    const question = await this.assertQuestion(id, QuestionType.MSQ, userId, role);
    await this.assertExamWritable(question.examId, userId, role);
    await this.questionRepository.delete(id);
    return id;
  }
}
 