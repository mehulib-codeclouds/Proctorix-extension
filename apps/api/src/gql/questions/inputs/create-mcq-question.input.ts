import { Field, InputType, Int } from '@nestjs/graphql';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

@InputType()
export class CreateMcqOptionInput {
  @Field()
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  text: string;
}

@InputType()
export class CreateMcqQuestionInput {
  @Field()
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  text: string;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  @Min(1)
  durationMinutes?: number;

  @Field(() => Int)
  @IsInt()
  @Min(1)
  marks: number;

  @Field()
  @IsUUID()
  examId: string;

  @Field(() => [CreateMcqOptionInput])
  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(6)
  @ValidateNested({ each: true })
  @Type(() => CreateMcqOptionInput)
  options: CreateMcqOptionInput[];

  @Field(() => Int)
  @IsInt()
  @Min(0)
  correctOptionIndex: number;
}
