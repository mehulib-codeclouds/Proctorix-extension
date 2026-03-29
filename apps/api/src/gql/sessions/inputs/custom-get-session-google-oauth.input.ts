import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class CustomGetSessionGoogleOAuth {
  @Field()
  code: string;

  @Field({ nullable: true })
  error?: string;
}
