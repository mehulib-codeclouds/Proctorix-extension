import { ConfigifyModule } from '@itgorillaz/configify';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppConfiguration } from './config/app.config';
import { Attempt } from './entities/attempt.entity';
import { AttemptMcqAnswer } from './entities/attempt-mcq-answer.entity';
import { AttemptMsqAnswer } from './entities/attempt-msq-answer.entity';
import { Exam } from './entities/exam.entity';
import { McqAnswer } from './entities/mcq-answer.entity';
import { McqOption } from './entities/mcq-option.entity';
import { MsqAnswer } from './entities/msq-answer.entity';
import { MsqOption } from './entities/msq-option.entity';
import { Question } from './entities/question.entity';
import { Session } from './entities/session.entity';
import { User } from './entities/user.entity';

@Module({
  imports: [
    ConfigifyModule.forRootAsync(),
    TypeOrmModule.forRootAsync({
      useFactory: (appConfiguration: AppConfiguration) => ({
        type: 'postgres',
        url: appConfiguration.databaseUrl,
        entities: [
          User,
          Session,
          Exam,
          Question,
          Attempt,
          McqOption,
          MsqOption,
          McqAnswer,
          MsqAnswer,
          AttemptMcqAnswer,
          AttemptMsqAnswer,
        ],
      }),
      inject: [AppConfiguration],
    }),
  ],
})
export class AppModule {}
