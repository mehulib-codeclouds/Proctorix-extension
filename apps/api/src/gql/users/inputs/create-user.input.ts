import { Field, InputType } from "@nestjs/graphql";
import { UserRole } from "/entities/user.entity";

@InputType()
export class CreateUserInput {
    @Field()
    name: string

    @Field()
    email: string

    @Field({ nullable: true })
    password?: string | null

    @Field(() => UserRole, { nullable: true })
    role?: UserRole

    @Field({ nullable: true })
    isVerified?: boolean
}