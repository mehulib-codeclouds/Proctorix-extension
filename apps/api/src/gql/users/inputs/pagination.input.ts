import { Field, InputType, Int } from "@nestjs/graphql";

@InputType()
export class UserPaginationType {
    @Field(() => Int, { nullable: true, defaultValue: 0 })
    limit?: number | undefined

    @Field(() => Int, { nullable: true, defaultValue: 0 })
    offset?: number | undefined
}
