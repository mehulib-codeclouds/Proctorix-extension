import { Inject, UseGuards } from '@nestjs/common';
import {
  Args,
  Mutation,
  Parent,
  Query,
  ResolveField,
  Resolver,
} from '@nestjs/graphql';
import { CurrentUser } from '/auth/decorators/current-user.decorator';
import { Roles } from '/auth/decorators/roles.decorator';
import { AuthGuard } from '/auth/guards/auth.guard';
import { RolesGuard } from '/auth/guards/roles.guard';
import { UsersService } from '/auth/users/users.service';
import { Attempt } from '/entities/attempt.entity';
import { Exam } from '/entities/exam.entity';
import { Session } from '/entities/session.entity';
import { User, UserRole } from '/entities/user.entity';
import { CreateUserInput } from './inputs/create-user.input';
import { UpdateUserInput } from './inputs/update-user.input';

@Resolver(() => User)
export class UsersResolver {
  constructor(
    @Inject(UsersService) private readonly usersService: UsersService,
  ) {}

  @ResolveField(() => [Session])
  async sessions(@Parent() user: User) {
    const { id } = user;
    // TODO:
    // return this.sessionsService.findMany({ userId: id });
  }

  @ResolveField(() => [Exam])
  async exams(@Parent() user: User) {
    const { id } = user;
    // TODO:
    // return this.examsService.findMany({ userId: id });
  }

  @ResolveField(() => [Attempt])
  async attempts(@Parent() user: User) {
    const { id } = user;
    // TODO:
    // return this.attemptsService.findMany({ userId: id });
  }

  @Query(() => User, { nullable: true })
  async user(@Args('id') id?: string) {
    return this.usersService.findOne({ id });
  }

  @Query(() => [User])
  async users() {
    return this.usersService.findMany();
  }

  @Mutation(() => User)
  async createUser(
    @Args('createUserData', { type: () => CreateUserInput })
    createUserData: CreateUserInput,
  ) {
    return this.usersService.create(createUserData);
  }

  @Mutation(() => User, { nullable: true })
  @UseGuards(AuthGuard)
  async updateUser(
    @Args('updateUserData', { type: () => UpdateUserInput })
    updateUserData: UpdateUserInput,
    @CurrentUser() user: User,
  ) {
    return this.usersService.update(updateUserData, user);
  }

  @Mutation(() => User, { nullable: true })
  @UseGuards(AuthGuard)
  async deleteUser(@Args('id') id: string, @CurrentUser() user: User) {
    return this.usersService.delete(id, user);
  }

  @Mutation(() => [User])
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async batchDeleteUsers(
    @Args('ids', { type: () => [String] }) ids: string[],
    @CurrentUser() user: User,
  ) {
    return this.usersService.deleteMany(ids, user);
  }
}
