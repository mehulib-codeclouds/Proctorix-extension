import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class CreateMcqOptionInput {
  @Field()
  questionId: string;

  @Field()
  text: string;
}