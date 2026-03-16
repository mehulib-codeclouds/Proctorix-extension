import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class CreateSessionInput {
  @Field()
  email: string;

  @Field()
  password: string;
}