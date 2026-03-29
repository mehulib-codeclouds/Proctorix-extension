import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { Question, type QuestionType } from '/entities/question.entity';
import { UserRole } from '/entities/user.entity';
import type { ExamsService } from '/exam/exams/exams.service';

@Injectable()
export class QuestionsService {
  constructor(
    @InjectRepository(Question)
    private readonly questionsRepo: Repository<Question>,

    private readonly examsService: ExamsService,
  ) {}

  async getQuestions({
    examId,
    userId,
    role,
  }: {
    examId: string;
    userId: string;
    role: UserRole;
  }): Promise<Question[]> {
    await this.examsService.getExamById({ id: examId, userId, role });

    return this.questionsRepo.find({
      where: { exam: { id: examId } },
      order: { createdAt: 'ASC' },
    });
  }

  async getQuestionById({
    id,
    userId,
    role,
  }: {
    id: string;
    userId: string;
    role: UserRole;
  }): Promise<Question> {
    const question = await this.questionsRepo.findOne({
      where: { id },
      relations: ['exam', 'exam.createdBy'],
    });

    if (!question) {
      throw new NotFoundException('Question not found');
    }

    if (role !== UserRole.ADMIN && question.exam.createdBy.id !== userId) {
      throw new ForbiddenException(
        'You are not allowed to access this question',
      );
    }

    return question;
  }

  async createQuestion({
    text,
    type,
    marks,
    durationMinutes,
    examId,
    userId,
    role,
  }: {
    text: string;
    type: QuestionType;
    marks: number;
    durationMinutes?: number | null;
    examId: string;
    userId: string;
    role: UserRole;
  }): Promise<Question> {
    if (![UserRole.ADMIN, UserRole.EXAMINER].includes(role)) {
      throw new ForbiddenException('You are not allowed to create questions');
    }

    const exam = await this.examsService.getExamById({
      id: examId,
      userId,
      role,
    });

    if (new Date() >= new Date(exam.startTime)) {
      throw new BadRequestException(
        'Cannot add questions after exam has started',
      );
    }

    const question = this.questionsRepo.create({
      text,
      type,
      marks,
      durationMinutes,
      exam: { id: examId },
    });

    return this.questionsRepo.save(question);
  }

  async updateQuestion({
    id,
    text,
    marks,
    durationMinutes,
    userId,
    role,
  }: {
    id: string;
    text?: string;
    marks?: number;
    durationMinutes?: number | null;
    userId: string;
    role: UserRole;
  }): Promise<Question> {
    const question = await this.questionsRepo.findOne({
      where: { id },
      relations: ['exam', 'exam.createdBy'],
    });

    if (!question) {
      throw new NotFoundException('Question not found');
    }

    if (role !== UserRole.ADMIN && question.exam.createdBy.id !== userId) {
      throw new ForbiddenException(
        'You are not allowed to update this question',
      );
    }

    if (new Date() >= new Date(question.exam.startTime)) {
      throw new BadRequestException(
        'Cannot modify questions after exam has started',
      );
    }

    Object.assign(question, { text, marks, durationMinutes });

    return this.questionsRepo.save(question);
  }

  async deleteQuestion({
    id,
    userId,
    role,
  }: {
    id: string;
    userId: string;
    role: UserRole;
  }): Promise<boolean> {
    const question = await this.questionsRepo.findOne({
      where: { id },
      relations: ['exam', 'exam.createdBy'],
    });

    if (!question) {
      throw new NotFoundException('Question not found');
    }

    if (role !== UserRole.ADMIN && question.exam.createdBy.id !== userId) {
      throw new ForbiddenException(
        'You are not allowed to delete this question',
      );
    }

    if (new Date() >= new Date(question.exam.startTime)) {
      throw new BadRequestException(
        'Cannot delete questions after exam has started',
      );
    }

    await this.questionsRepo.delete(id);

    return true;
  }

  async deleteManyQuestions({
    ids,
    userId,
    role,
  }: {
    ids: string[];
    userId: string;
    role: UserRole;
  }): Promise<boolean> {
    for (const id of ids) {
      const question = await this.questionsRepo.findOne({
        where: { id },
        relations: ['exam', 'exam.createdBy'],
      });

      if (!question) {
        throw new NotFoundException(`Question with id ${id} not found`);
      }

      if (role !== UserRole.ADMIN && question.exam.createdBy.id !== userId) {
        throw new ForbiddenException(
          `You are not allowed to delete question ${id}`,
        );
      }

      if (new Date() >= new Date(question.exam.startTime)) {
        throw new BadRequestException(
          'Cannot delete questions after exam has started',
        );
      }

      await this.questionsRepo.delete(id);
    }

    return true;
  }
}
