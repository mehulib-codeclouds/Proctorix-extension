// import { Module } from '@nestjs/common';
// import { TypeOrmModule } from '@nestjs/typeorm';

// import { Exam } from '/entities/exam.entity';
// import { McqAnswer } from '/entities/mcq-answer.entity';
// import { McqOption } from '/entities/mcq-option.entity';
// import { MsqAnswer } from '/entities/msq-answer.entity';
// import { MsqOption } from '/entities/msq-option.entity';
// import { Question } from '/entities/question.entity';
// import { User } from '/entities/user.entity';
// import { MCQAnswerService } from './answers/mcq-answer.service';
// import { MSQAnswerService } from './answers/msq-answer.service';
// import { ExamsService } from './exams/exams.service';

// @Module({
//   imports: [
//     TypeOrmModule.forFeature([
//       Exam,
//       User,
//       McqAnswer,
//       MsqAnswer,
//       MsqOption,
//       McqOption,
//       Question,
//     ]),
//   ],
//   providers: [ExamsService, MCQAnswerService, MSQAnswerService],
//   exports: [ExamsService, MCQAnswerService, MSQAnswerService],
// })
// export class ExamsModule {}


import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Exam } from '/entities/exam.entity';
import { McqAnswer } from '/entities/mcq-answer.entity';
import { McqOption } from '/entities/mcq-option.entity';
import { MsqAnswer } from '/entities/msq-answer.entity';
import { MsqOption } from '/entities/msq-option.entity';
import { Question } from '/entities/question.entity';
import { User } from '/entities/user.entity';
import { MCQAnswerService } from './answers/mcq-answer.service';
import { MSQAnswerService } from './answers/msq-answer.service';
import { ExamsService } from './exams/exams.service';
import { QuestionsService } from './questions/questions.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Exam,
      User,
      McqAnswer,
      MsqAnswer,
      MsqOption,
      McqOption,
      Question,
    ]),
  ],
  providers: [ExamsService, MCQAnswerService, MSQAnswerService, QuestionsService],
  exports: [ExamsService, MCQAnswerService, MSQAnswerService, QuestionsService],
})
export class ExamsModule {}