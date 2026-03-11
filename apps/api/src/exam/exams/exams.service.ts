import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, type Repository } from 'typeorm';
import type { CreateExamInput } from '/gql/exams/Input/CreateExamInput';
import type { UpdateExamInput } from '/gql/exams/Input/UpdateExamInput';
import type { UserContextInput } from '/gql/exams/Input/UserContextInput';
import { Exam } from '../../entities/exam.entity';
import { User, UserRole } from '../../entities/user.entity';

@Injectable()
export class ExamsService {
  constructor(
    @InjectRepository(Exam)
    private readonly examRepository: Repository<Exam>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async getExams(user: User, limit?: number, offset?: number): Promise<Exam[]> {
    if (user.role === UserRole.ADMIN) {
      return this.examRepository.find({
        take: limit,
        skip: offset,
      });
    }

    return this.examRepository.find({
      where: {
        createdBy: {
          id: user.id,
        },
      },
      take: limit,
      skip: offset,
    });
  }


  async getExamById(id: string, user: User): Promise<Exam> {
    const exam = await this.examRepository.findOne({
      where: { id },
      relations: ['createdBy'],
    });

    if (!exam) {
      throw new NotFoundException('Exam not found');
    }

    if (user.role === UserRole.ADMIN) {
      return exam;
    }

    if (exam.createdBy.id !== user.id) {
      throw new ForbiddenException('You are not allowed to access this exam');
    }

    return exam;
  }



  async createExam(
    input: CreateExamInput,
    user: UserContextInput,
  ): Promise<Exam> {
    if (user.role !== UserRole.ADMIN && user.role !== UserRole.EXAMINER) {
      throw new ForbiddenException('You are not allowed to create exams');
    }

    const creator = await this.userRepository.findOne({
      where: { id: user.id },
    });

    if (!creator) {
      throw new NotFoundException('User not found');
    }

    const exam = this.examRepository.create({
      ...input,
      createdBy: creator,
    });

    return this.examRepository.save(exam);
  }




  async updateExam(
    id: string,
    input: UpdateExamInput,
    user: UserContextInput,
  ): Promise<Exam> {
    const exam = await this.examRepository.findOne({
      where: { id },
      relations: ['createdBy'],
    });

    if (!exam) {
      throw new NotFoundException('Exam not found');
    }

    if (user.role !== UserRole.ADMIN && exam.createdBy.id !== user.id) {
      throw new ForbiddenException('You are not allowed to update this exam');
    }

    Object.assign(exam, input);

    return this.examRepository.save(exam);
  }




  async deleteExam(id: string, user: UserContextInput): Promise<boolean> {
    const exam = await this.examRepository.findOne({
      where: { id },
    });

    if (!exam) {
      throw new NotFoundException('Exam not found');
    }

    if (user.role !== UserRole.ADMIN && exam.createdById !== user.id) {
      throw new ForbiddenException('You are not allowed to delete this exam');
    }

    await this.examRepository.remove(exam);

    return true;
  }




  async deleteManyExams(
  ids: string[],
  user: UserContextInput,
): Promise<boolean> {
  const exams = await this.examRepository.findBy({ id: In(ids) });

  if (exams.length !== ids.length) {
    const foundIds = new Set(exams.map((e) => e.id));
    const missingId = ids.find((id) => !foundIds.has(id));
    throw new NotFoundException(`Exam with id ${missingId} not found`);
  }
  if (user.role !== UserRole.ADMIN) {
    const forbidden = exams.find((e) => e.createdById !== user.id);
    if (forbidden) {
      throw new ForbiddenException(
        `You are not allowed to delete exam ${forbidden.id}`,
      );
    }
  }

  await this.examRepository.delete({ id: In(ids) });

  return true;
}
}
