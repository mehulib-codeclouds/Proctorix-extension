import { Field, InputType, Int } from '@nestjs/graphql';
import {
    ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
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
export class CreateMsqOptionInput {
  @Field()
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  text: string;

  @Field()
  @IsBoolean()
  hasPartialMarking: boolean;
}

@InputType()
export class CreateMsqQuestionInput {
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

  @Field(() => [CreateMsqOptionInput])
  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => CreateMsqOptionInput)
  options: CreateMsqOptionInput[];

  @Field(() => [Int])
  @IsArray()
  @ArrayMinSize(1)
  @IsInt({ each: true })
  @Min(0, { each: true })
  correctOptionIndices: number[];
}
