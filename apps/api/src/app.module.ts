import { ConfigifyModule } from '@itgorillaz/configify';
import { ApolloDriver, type ApolloDriverConfig } from '@nestjs/apollo';
import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
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
import { GqlModule } from './gql/gql.module';

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
    GraphQLModule.forRootAsync<ApolloDriverConfig>({
      driver: ApolloDriver,
      useFactory: (appConfiguration: AppConfiguration) => ({
        playground: appConfiguration.nodeEnv === 'dev',
        autoSchemaFile: "schema.gql"
      }),
      inject: [AppConfiguration],
    }),
    GqlModule,
    AuthModule,
  ],
})
export class AppModule {}
