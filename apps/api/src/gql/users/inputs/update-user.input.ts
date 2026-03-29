import { Field, InputType } from '@nestjs/graphql';
import { UserRole } from '/entities/user.entity';

@InputType()
export class UpdateUserInput {
  @Field()
  id: string;

  @Field({ nullable: true })
  name?: string | undefined;

  @Field({ nullable: true })
  email?: string | undefined;

  @Field({ nullable: true })
  password?: string | null;

  @Field(() => UserRole, { nullable: true })
  role?: UserRole;

  @Field({ nullable: true })
  isVerified?: boolean;
}
