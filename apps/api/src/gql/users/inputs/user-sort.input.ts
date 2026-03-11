import { Field, InputType, registerEnumType } from "@nestjs/graphql";

export enum SortDirection {
    ASC = "ASC",
    DESC = "DESC"
}

registerEnumType(SortDirection, { name: "SortDirection" });

@InputType()
export class UserSortType {
    @Field()
    field: string

    @Field(() => SortDirection, { defaultValue: SortDirection.ASC, nullable: true })
    sortDirection?: SortDirection | undefined
}
