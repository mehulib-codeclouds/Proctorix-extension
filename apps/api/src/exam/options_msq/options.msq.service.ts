import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { MsqOption } from '../../entities/msq-option.entity';
import { UserRole } from '../../entities/user.entity';
import type { QuestionsService } from '../questions/questions.service';

@Injectable()
export class OptionsService {
  constructor(
    @InjectRepository(MsqOption)
    private readonly msqOptionsRepo: Repository<MsqOption>,

    private readonly questionsService: QuestionsService,
  ) {}

  // MSQ OPTIONS

  async getMsqOptions(questionId: string): Promise<MsqOption[]> {
    return this.msqOptionsRepo.find({
      where: { question: { id: questionId } },
    });
  }

  async createMsqOption({
    text,
    hasPartialMarking,
    questionId,
    userId,
    role,
  }: {
    text: string;
    hasPartialMarking: boolean;
    questionId: string;
    userId: string;
    role: UserRole;
  }): Promise<MsqOption> {
    if (![UserRole.ADMIN, UserRole.EXAMINER].includes(role)) {
      throw new ForbiddenException('You are not allowed to create options');
    }

    const question = await this.questionsService.getQuestionById({
      id: questionId,
      userId,
      role,
    });

    if (new Date() >= new Date(question.exam.startTime)) {
      throw new BadRequestException(
        'Cannot add options after exam has started',
      );
    }

    const option = this.msqOptionsRepo.create({
      text,
      hasPartialMarking,
      question: { id: questionId },
    });

    return this.msqOptionsRepo.save(option);
  }

  async updateMsqOption({
    id,
    text,
    hasPartialMarking,
    userId,
    role,
  }: {
    id: string;
    text?: string;
    hasPartialMarking?: boolean;
    userId: string;
    role: UserRole;
  }): Promise<MsqOption> {
    const option = await this.msqOptionsRepo.findOne({
      where: { id },
      relations: ['question', 'question.exam', 'question.exam.createdBy'],
    });

    if (!option) {
      throw new NotFoundException('MSQ option not found');
    }

    if (
      role !== UserRole.ADMIN &&
      option.question.exam.createdBy.id !== userId
    ) {
      throw new ForbiddenException('You are not allowed to update this option');
    }

    if (new Date() >= new Date(option.question.exam.startTime)) {
      throw new BadRequestException(
        'Cannot modify options after exam has started',
      );
    }

    Object.assign(option, { text, hasPartialMarking });

    return this.msqOptionsRepo.save(option);
  }

  async deleteMsqOption({
    id,
    userId,
    role,
  }: {
    id: string;
    userId: string;
    role: UserRole;
  }): Promise<boolean> {
    const option = await this.msqOptionsRepo.findOne({
      where: { id },
      relations: ['question', 'question.exam', 'question.exam.createdBy'],
    });

    if (!option) {
      throw new NotFoundException('MSQ option not found');
    }

    if (
      role !== UserRole.ADMIN &&
      option.question.exam.createdBy.id !== userId
    ) {
      throw new ForbiddenException('You are not allowed to delete this option');
    }

    if (new Date() >= new Date(option.question.exam.startTime)) {
      throw new BadRequestException(
        'Cannot delete options after exam has started',
      );
    }

    await this.msqOptionsRepo.delete(id);

    return true;
  }
}
