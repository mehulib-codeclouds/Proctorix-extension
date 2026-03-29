import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class CreateMSQAnswerInput {
  @Field()
  questionId: string;

  @Field(() => [String])
  optionIds: string[];
}
