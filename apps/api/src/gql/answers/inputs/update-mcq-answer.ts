import { Field, InputType } from '@nestjs/graphql';
@InputType()
export class UpdateMCQAnswerInput {
  @Field()
  questionId: string;

  @Field()
  optionId: string;
}
