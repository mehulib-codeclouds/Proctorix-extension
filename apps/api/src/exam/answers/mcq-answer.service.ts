import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { McqAnswer } from '/entities/mcq-answer.entity';
import { McqOption } from '/entities/mcq-option.entity';
import { Question } from '/entities/question.entity';
import { UserRole } from '/entities/user.entity';

@Injectable()
export class MCQAnswerService {
  constructor(
    @InjectRepository(McqAnswer)
    private readonly mcqAnswerRepository: Repository<McqAnswer>,
    @InjectRepository(McqOption)
    private readonly mcqOptionRepository: Repository<McqOption>,
    @InjectRepository(Question)
    private readonly questionRepository: Repository<Question>,
  ) {}
  // MCQ Answer Methods
  async CreateMCQAnswer({
    questionId,
    optionId,
    userId,
    role,
  }: {
    questionId: string;
    optionId: string;
    userId: string;
    role: UserRole;
  }): Promise<McqAnswer> {
    console.log(
      'Creating MCQ Answer with questionId:',
      questionId,
      'optionId:',
      optionId,
      'userId:',
      userId,
      'role:',
      role,
    );
    if (role !== UserRole.EXAMINER && role !== UserRole.ADMIN) {
      throw new ForbiddenException(
        'Candidates are not allowed to create MCQ Answers',
      );
    }
    const question = await this.questionRepository.findOne({
      where: { id: questionId },
    });
    if (!question) {
      throw new NotFoundException('Question not found');
    }
    const option = await this.mcqOptionRepository.findOne({
      where: { id: optionId },
    });
    if (!option) {
      throw new NotFoundException('MCQ Option not found');
    }

    if (option.questionId !== questionId) {
      throw new ForbiddenException(
        'MCQ Option does not belong to the specified question',
      );
    }

    const existingAnswer = await this.mcqAnswerRepository.findOne({
      where: { question: { id: questionId } }, // ✅ query through the relation
    });

    if (existingAnswer) {
      throw new ForbiddenException(
        'Answer already exists for this question and user',
      );
    }
    const mcqAnswer = this.mcqAnswerRepository.create({
      question,
      option,
    });
    return this.mcqAnswerRepository.save(mcqAnswer);
  }

  async getMCQAnswer({
    questionId,
    role,
  }: {
    questionId: string;
    role: string;
  }): Promise<McqAnswer> {
    const mcqAnswer = await this.mcqAnswerRepository.findOne({
      where: { question: { id: questionId } }, 
    });

    if (!mcqAnswer) {
      throw new NotFoundException('MCQ Answer not found');
    }
    console.log('Fetched MCQ Answer:', mcqAnswer);
    if (role !== UserRole.EXAMINER && role !== UserRole.ADMIN) {
      throw new ForbiddenException(
        'Candidates are not allowed to access this resource',
      );
    }
    return mcqAnswer;
  }

  async getMcqOption(optionId: string): Promise<McqOption> {
    const option = await this.mcqOptionRepository.findOne({
      where: { id: optionId },
    });
    if (!option) {
      throw new NotFoundException('MCQ Option not found');
    }
    return option;
  }
  async updateMCQAnswer({
    questionId,
    optionId,
    userId,
    role,
  }: {
    questionId: string;
    optionId: string;
    userId: string;
    role: UserRole;
  }): Promise<McqAnswer> {
    console.log(
      'Updating MCQ Answer with questionId:',
      questionId,
      'optionId:',
      optionId,
      'userId:',
      userId,
      'role:',
      role,
    );
    if (role !== UserRole.EXAMINER && role !== UserRole.ADMIN) {
      throw new ForbiddenException(
        'Candidates are not allowed to update MCQ Answers',
      );
    }
    const mcqAnswer = await this.mcqAnswerRepository.findOne({
      where: {
        question: { id: questionId }, 
      }
    });

    if (!mcqAnswer) {
      throw new NotFoundException('MCQ Answer not found');
    }

    const option = await this.mcqOptionRepository.findOne({
      where: { id: optionId },
    });
    if (!option) {
      throw new NotFoundException('MCQ Option not found');
    }

    if (option.questionId !== questionId) {
      throw new ForbiddenException(
        'MCQ Option does not belong to the specified question',
      );
    }
    mcqAnswer.option = option;
    return this.mcqAnswerRepository.save(mcqAnswer);
  }

  async deleteMCQAnswer({
    questionId,
    userId,
    role,
  }: {
    questionId: string;
    userId: string;
    role: UserRole;
  }): Promise<boolean> {
    console.log(
      'Deleting MCQ Answer with questionId:',
      questionId,
      'by userId:',
      userId,
      'with role:',
      role,
    );
    const mcqAnswer = await this.mcqAnswerRepository.findOne({
      where: { question: { id: questionId } },
    });

    if (!mcqAnswer) {
      throw new NotFoundException('MCQ Answer not found');
    }

    if (role !== UserRole.EXAMINER && role !== UserRole.ADMIN) {
      throw new ForbiddenException(
        'Candidates are not allowed to delete this resource',
      );
    }

    await this.mcqAnswerRepository.delete({ question: { id: questionId } });
    return true;
  }
}
