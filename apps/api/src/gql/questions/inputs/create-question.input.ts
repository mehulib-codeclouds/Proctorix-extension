import { Field, InputType, Int } from '@nestjs/graphql';
import {
  IsEnum,
} from 'class-validator';
import { QuestionType } from '/entities/question.entity';


@InputType()
export class CreateQuestionInput {
  @Field()
  text: string;

  @Field(() => QuestionType)
  @IsEnum(QuestionType)
  type: QuestionType;

  @Field(() => Int)
  marks: number;

  @Field(() => Int, { nullable: true })
  durationMinutes?: number | null;

  @Field()
  examId: string;
}