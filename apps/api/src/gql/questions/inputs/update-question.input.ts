import { Field, InputType, Int } from '@nestjs/graphql';
import {
  IsOptional,
} from 'class-validator';

@InputType()
export class UpdateQuestionInput {
  @Field()
  id: string;

  @Field({ nullable: true })
  @IsOptional()
  text?: string;

  @Field(() => Int, { nullable: true })
  marks?: number;

  @Field(() => Int, { nullable: true })
  durationMinutes?: number | null;
}