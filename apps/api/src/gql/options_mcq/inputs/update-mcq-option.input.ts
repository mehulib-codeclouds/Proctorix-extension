import { Field, InputType } from '@nestjs/graphql';


@InputType()
export class UpdateMcqOptionInput {
  @Field()
  id: string;

  @Field()
  text: string;
}