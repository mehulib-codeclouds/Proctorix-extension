import { Field, InputType } from '@nestjs/graphql';
import { IsBoolean, IsOptional } from 'class-validator';

@InputType()
export class UpdateMsqOptionInput {
  @Field()
  id: string;

  @Field({ nullable: true })
  @IsOptional()
  text?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsBoolean()
  hasPartialMarking?: boolean;
}
