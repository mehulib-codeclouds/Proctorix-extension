import { Field, InputType, Int } from '@nestjs/graphql';

@InputType()
export class CreateExamInput {

  @Field()
  title: string;

  @Field()
  description: string;

  @Field(() => Int, { nullable: true })
  durationMinutes?: number;

  @Field()
  startTime: Date;

  @Field()
  endTime: Date;

  @Field(() => Int, { nullable: true })
  passingMarks?: number;

  @Field(() => Int)
  attemptsAllowed: number;
}