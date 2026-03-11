import { Field, InputType, Int } from '@nestjs/graphql';

@InputType()
export class UpdateExamInput {
  @Field({ nullable: true })
  title?: string;

  @Field({ nullable: true })
  description?: string;

  @Field(() => Int, { nullable: true })
  durationMinutes?: number;

  @Field({ nullable: true })
  startTime?: Date;

  @Field({ nullable: true })
  endTime?: Date;

  @Field(() => Int, { nullable: true })
  passingMarks?: number;

  @Field(() => Int, { nullable: true })
  attemptsAllowed?: number;
}