import { Field, InputType } from '@nestjs/graphql';
import { UserRole } from '/entities/user.entity';

@InputType()
export class UserFilterType {
  @Field({ nullable: true })
  name?: string | undefined;

  @Field({ nullable: true })
  email?: string | undefined;

  @Field(() => UserRole, { nullable: true })
  role?: UserRole | undefined;
}
