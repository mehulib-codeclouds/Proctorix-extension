import { Field, ID, InputType } from "@nestjs/graphql";
import { UserRole } from "/entities/user.entity";

@InputType()
export class UserContextInput {

  @Field(() => ID)
  id: string;

  @Field(() => UserRole)
  role: UserRole;
}