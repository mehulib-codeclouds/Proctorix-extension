import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, type Repository } from 'typeorm';
import { MsqAnswer } from '/entities/msq-answer.entity';
import { MsqOption } from '/entities/msq-option.entity';
import { Question } from '/entities/question.entity';
import { UserRole } from '/entities/user.entity';

@Injectable()
export class MSQAnswerService {
  constructor(
    @InjectRepository(MsqAnswer)
    private readonly msqAnswerRepository: Repository<MsqAnswer>,
    @InjectRepository(MsqOption)
    private readonly msqOptionRepository: Repository<MsqOption>,
    @InjectRepository(Question)
    private readonly questionRepository: Repository<Question>,
  ) {}
  async CreateMSQAnswer({
    questionId,
    optionIds,
    userId,
    role,
  }: {
    questionId: string;
    optionIds: string[];
    userId: string;
    role: UserRole;
  }): Promise<MsqAnswer[]> {
    if (!userId || (role !== UserRole.EXAMINER && role !== UserRole.ADMIN)) {
      throw new ForbiddenException(
        'Candidates are not allowed to create MSQ Answers',
      );
    }
    const question = await this.questionRepository.findOne({
      where: { id: questionId },
    });
    if (!question) {
      throw new NotFoundException('Question not found');
    }
    const options = await this.msqOptionRepository.findBy({
      id: In(optionIds),
      question: { id: questionId },
    });
    if (options.length !== optionIds.length) {
      throw new BadRequestException(
        'One or more MSQ Options not found for the given question',
      );
    }
    const existingAnswers = await this.msqAnswerRepository.findBy({
      question: { id: questionId },
    });
    if (existingAnswers.length > 0) {
      throw new BadRequestException('Answers already exist for this question');
    }

    const msqAnswers = options.map((option) =>
      this.msqAnswerRepository.create({
        question: { id: questionId },
        option: { id: option.id },
      }),
    );
    return this.msqAnswerRepository.save(msqAnswers);
  }
  async getMSQAnswer({
    questionId,
    userId,
    role,
  }: {
    questionId: string;
    userId: string;
    role: UserRole;
  }): Promise<MsqAnswer[]> {
    console.log(questionId, userId, role);
    if (!userId || (role !== UserRole.EXAMINER && role !== UserRole.ADMIN)) {
      throw new ForbiddenException(
        'Candidates are not allowed to view MSQ Answers',
      );
    }
    const question = await this.questionRepository.findOne({
      where: { id: questionId },
    });
    if (!question) {
      throw new NotFoundException('Question not found');
    }
    const msqAnswers = await this.msqAnswerRepository.findBy({
      question: { id: questionId },
    });
    return msqAnswers;
  }
  async getMsqOption(optionId: string): Promise<MsqOption> {
    const option = await this.msqOptionRepository.findOne({
      where: { id: optionId },
    });
    if (!option) {
      throw new NotFoundException('MSQ Option not found');
    }
    return option;
  }

  async updateMSQAnswer({
    questionId,
    optionIds,
    userId,
    role,
  }: {
    questionId: string;
    optionIds: string[];
    userId: string;
    role: UserRole;
  }): Promise<MsqAnswer[]> {
    if (!userId || (role !== UserRole.EXAMINER && role !== UserRole.ADMIN)) {
      throw new ForbiddenException(
        'Candidates are not allowed to update MSQ Answers',
      );
    }
    const question = await this.questionRepository.findOne({
      where: { id: questionId },
    });
    if (!question) {
      throw new NotFoundException('Question not found');
    }
    const options = await this.msqOptionRepository.findBy({
      id: In(optionIds),
      question: { id: questionId },
    });
    if (options.length !== optionIds.length) {
      throw new BadRequestException(
        'One or more MSQ Options not found for the given question',
      );
    }
    await this.msqAnswerRepository.delete({
      question: { id: questionId },
    });

    const answers = options.map((option) =>
      this.msqAnswerRepository.create({
        question,
        option,
      }),
    );
    return this.msqAnswerRepository.save(answers);
  }
  async deleteMSQAnswer({
    questionId,
    userId,
    role,
  }: {
    questionId: string;
    userId: string;
    role: UserRole;
  }): Promise<boolean> {
    if (!userId || (role !== UserRole.EXAMINER && role !== UserRole.ADMIN)) {
      throw new ForbiddenException(
        'Candidates are not allowed to delete MSQ Answers',
      );
    }
    const question = await this.questionRepository.findOne({
      where: { id: questionId },
    });
    if (!question) {
      throw new NotFoundException('Question not found');
    }
    const msqAnswers = await this.msqAnswerRepository.findBy({
      question: { id: questionId },
    });
    if (msqAnswers.length === 0) {
      throw new NotFoundException('MSQ Answers not found');
    }
    await this.msqAnswerRepository.remove(msqAnswers);
    return true;
  }
}
