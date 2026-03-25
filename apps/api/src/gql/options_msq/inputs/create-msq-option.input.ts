import { Field, InputType } from '@nestjs/graphql';
import { IsBoolean } from 'class-validator';

@InputType()
export class CreateMsqOptionInput {
  @Field()
  questionId: string;

  @Field()
  text: string;

  @Field()
  @IsBoolean()
  hasPartialMarking: boolean;
}