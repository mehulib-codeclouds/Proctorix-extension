import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { McqOption } from '../../entities/mcq-option.entity';
import { MsqOption } from '../../entities/msq-option.entity';
import { UserRole } from '../../entities/user.entity';
import { QuestionsService } from '../questions/questions.service';

@Injectable()
export class OptionsService {
  constructor(
    @InjectRepository(McqOption)
    private readonly mcqOptionsRepo: Repository<McqOption>,

    @InjectRepository(MsqOption)
    private readonly msqOptionsRepo: Repository<MsqOption>,

    private readonly questionsService: QuestionsService,
  ) {}

  // MCQ OPTIONS

  async getMcqOptions(questionId: string): Promise<McqOption[]> {
    return this.mcqOptionsRepo.find({
      where: { question: { id: questionId } },
    });
  }

  async createMcqOption({
    text,
    questionId,
    userId,
    role,
  }: {
    text: string;
    questionId: string;
    userId: string;
    role: UserRole;
  }): Promise<McqOption> {
    if (![UserRole.ADMIN, UserRole.EXAMINER].includes(role)) {
      throw new ForbiddenException('You are not allowed to create options');
    }

    const question = await this.questionsService.getQuestionById({ id: questionId, userId, role });

    if (new Date() >= new Date(question.exam.startTime)) {
      throw new BadRequestException('Cannot add options after exam has started');
    }

    const option = this.mcqOptionsRepo.create({
      text,
      question: { id: questionId },
    });

    return this.mcqOptionsRepo.save(option);
  }

  async updateMcqOption({
    id,
    text,
    userId,
    role,
  }: {
    id: string;
    text: string;
    userId: string;
    role: UserRole;
  }): Promise<McqOption> {
    const option = await this.mcqOptionsRepo.findOne({
      where: { id },
      relations: ['question', 'question.exam', 'question.exam.createdBy'],
    });

    if (!option) {
      throw new NotFoundException('MCQ option not found');
    }

    if (role !== UserRole.ADMIN && option.question.exam.createdBy.id !== userId) {
      throw new ForbiddenException('You are not allowed to update this option');
    }

    if (new Date() >= new Date(option.question.exam.startTime)) {
      throw new BadRequestException('Cannot modify options after exam has started');
    }

    option.text = text;

    return this.mcqOptionsRepo.save(option);
  }

  async deleteMcqOption({
    id,
    userId,
    role,
  }: {
    id: string;
    userId: string;
    role: UserRole;
  }): Promise<boolean> {
    const option = await this.mcqOptionsRepo.findOne({
      where: { id },
      relations: ['question', 'question.exam', 'question.exam.createdBy'],
    });

    if (!option) {
      throw new NotFoundException('MCQ option not found');
    }

    if (role !== UserRole.ADMIN && option.question.exam.createdBy.id !== userId) {
      throw new ForbiddenException('You are not allowed to delete this option');
    }

    if (new Date() >= new Date(option.question.exam.startTime)) {
      throw new BadRequestException('Cannot delete options after exam has started');
    }

    await this.mcqOptionsRepo.delete(id);

    return true;
  }
}