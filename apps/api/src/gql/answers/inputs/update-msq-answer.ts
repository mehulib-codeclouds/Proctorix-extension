import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class UpdateMSQAnswerInput {
  @Field()
  questionId: string;

  @Field(() => [String])
  optionIds: string[];
}