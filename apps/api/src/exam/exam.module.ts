import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Exam } from '/entities/exam.entity';
import { User } from '/entities/user.entity';

import { ExamsService } from './exams/exams.service';
import { QuestionsService } from './questions/questions.service';
import { Question } from '/entities/question.entity';
import { McqOption } from '/entities/mcq-option.entity';
import { MsqAnswer } from '/entities/msq-answer.entity';
import { MsqOption } from '/entities/msq-option.entity';
import { McqAnswer } from '/entities/mcq-answer.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Exam,
      User,
      Question,
      McqOption,
      McqAnswer,
      MsqOption,
      MsqAnswer,
    ]),
  ],
  providers: [
    ExamsService,
    QuestionsService,
  ],
  exports: [
    ExamsService,
    QuestionsService,
  ],
})
export class ExamsModule {}
