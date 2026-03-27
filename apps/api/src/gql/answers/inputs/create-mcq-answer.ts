import { Field, InputType } from '@nestjs/graphql';
@InputType()
export class CreateMCQAnswerInput {
  @Field()
  questionId: string;

  @Field()
  optionId: string;
}
