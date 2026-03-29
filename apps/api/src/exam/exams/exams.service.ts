import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { Exam } from '../../entities/exam.entity';
import { type User, UserRole } from '../../entities/user.entity';

@Injectable()
export class ExamsService {
  constructor(
    @InjectRepository(Exam)
    private readonly examRepository: Repository<Exam>,
  ) {}

  async findMany({
    userId,
    role,
  }: {
    userId: string;
    role: UserRole;
  }): Promise<Exam[]> {
    if (role === UserRole.ADMIN) {
      return this.examRepository.find();
    }

    return this.examRepository.find({
      where: {
        createdBy: {
          id: userId,
        },
      },
    });
  }

  async getExamById({
    id,
    userId,
    role,
  }: {
    id: string;
    userId: string;
    role: UserRole;
  }): Promise<Exam> {
    const exam = await this.examRepository.findOne({
      where: { id },
      relations: ['createdBy'],
    });

    if (!exam) {
      throw new NotFoundException('Exam not found');
    }

    if (role !== UserRole.ADMIN && exam.createdBy.id !== userId) {
      throw new ForbiddenException('You are not allowed to access this exam');
    }

    return exam;
  }

  async createExam({
    title,
    description,
    durationMinutes,
    startTime,
    endTime,
    passingMarks,
    attemptsAllowed,
    userId,
    role,
  }: {
    title: string;
    description: string;
    durationMinutes?: number | null;
    startTime: Date;
    endTime: Date;
    passingMarks?: number | null;
    attemptsAllowed: number;
    userId: string;
    role: UserRole;
  }): Promise<Exam> {
    if (![UserRole.ADMIN, UserRole.EXAMINER].includes(role)) {
      throw new ForbiddenException('You are not allowed to create exams');
    }

    const exam = this.examRepository.create({
      title,
      description,
      durationMinutes,
      startTime,
      endTime,
      passingMarks,
      attemptsAllowed,
      createdBy: { id: userId } as User,
    });

    return this.examRepository.save(exam);
  }

  async updateExam({
    id,
    title,
    description,
    durationMinutes,
    startTime,
    endTime,
    passingMarks,
    attemptsAllowed,
    userId,
    role,
  }: {
    id: string;
    title?: string;
    description?: string;
    durationMinutes?: number | null;
    startTime?: Date;
    endTime?: Date;
    passingMarks?: number | null;
    attemptsAllowed?: number;
    userId: string;
    role: UserRole;
  }): Promise<Exam> {
    const exam = await this.examRepository.findOne({
      where: { id },
      relations: ['createdBy'],
    });

    if (!exam) {
      throw new NotFoundException('Exam not found');
    }

    if (role !== UserRole.ADMIN && exam.createdBy.id !== userId) {
      throw new ForbiddenException('You are not allowed to update this exam');
    }

    Object.assign(exam, {
      title,
      description,
      durationMinutes,
      startTime,
      endTime,
      passingMarks,
      attemptsAllowed,
    });

    return this.examRepository.save(exam);
  }

  async deleteExam({
    id,
    userId,
    role,
  }: {
    id: string;
    userId: string;
    role: UserRole;
  }): Promise<boolean> {
    const exam = await this.examRepository.findOne({
      where: { id },
      relations: ['createdBy'],
    });

    if (!exam) {
      throw new NotFoundException('Exam not found');
    }

    if (role !== UserRole.ADMIN && exam.createdBy.id !== userId) {
      throw new ForbiddenException('You are not allowed to delete this exam');
    }

    await this.examRepository.delete(id);

    return true;
  }

  async deleteManyExams({
    ids,
    userId,
    role,
  }: {
    ids: string[];
    userId: string;
    role: UserRole;
  }): Promise<boolean> {
    for (const id of ids) {
      const exam = await this.examRepository.findOne({
        where: { id },
        relations: ['createdBy'],
      });

      if (!exam) {
        throw new NotFoundException(`Exam with id ${id} not found`);
      }

      if (role !== UserRole.ADMIN && exam.createdBy.id !== userId) {
        throw new ForbiddenException(
          `You are not allowed to delete exam ${id}`,
        );
      }

      await this.examRepository.delete(id);
    }

    return true;
  }
}
