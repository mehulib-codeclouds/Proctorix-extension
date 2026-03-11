import { Field, InputType } from '@nestjs/graphql';
import { UserPaginationType } from './pagination.input';
import { UserFilterType } from './user-filter.input';
import { UserSortType } from './user-sort.input';

@InputType()
export class UserFindManyType {
  @Field(() => UserFilterType, { nullable: true })
  filter?: UserFilterType | undefined;

  @Field(() => UserSortType, { nullable: true })
  sort?: UserSortType | undefined;

  @Field(() => UserPaginationType, { nullable: true })
  pagination?: UserPaginationType | undefined;
}
