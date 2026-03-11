import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { hash } from 'argon2';
import { Equal, ILike, In, type Repository } from 'typeorm';
import { User, UserRole } from '/entities/user.entity';
import type { CreateUserInput } from '/gql/users/inputs/create-user.input';
import type { UpdateUserInput } from '/gql/users/inputs/update-user.input';
import type { UserFindManyType } from '/gql/users/inputs/users-query.input';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly usersRepository: Repository<User>,
  ) {}

  async findOne({ id, email }: { id?: string; email?: string }) {
    return await this.usersRepository.findOneBy({
      ...(id && { id: Equal(id) }),
      ...(email && { email: Equal(email) }),
    });
  }

  async findMany(query?: UserFindManyType | undefined) {
    return await this.usersRepository.find({
      ...(query?.filter && {
        where: {
          ...(query.filter.name && { name: ILike(`%${query.filter.name}%`) }),
          ...(query.filter.email && {
            email: ILike(`%${query.filter.email}%`),
          }),
          ...(query.filter.role && { role: Equal(query.filter.role) }),
        },
      }),

      ...(query?.sort && {
        order: {
          [query.sort.field]: query.sort.sortDirection,
        },
      }),

      ...(query?.pagination?.limit && {
        take: query.pagination.limit,
      }),

      ...(query?.pagination?.offset && {
        skip: query.pagination.offset,
      }),
    });
  }

  async create(input: CreateUserInput) {
    const { name, email, password, role, isVerified } = input;

    const user = this.usersRepository.create({
      name,
      email,
      ...(password !== undefined && {
        password: password === null ? null : await hash(password),
      }),
      ...(role !== undefined && { role }),
      ...(isVerified !== undefined && { isVerified })
    });
    return await this.usersRepository.save(user);
  }

  async update(input: UpdateUserInput, user: User) {
    const { id, name, email, password, role, isVerified } = input;

    const userToUpdate = await this.findOne({ id })

    if (!userToUpdate) return null;

    // CHECK IF THE USER TRYING TO EDIT IS SELF, AND HAS SUFFICIENT PERMISSIONS
    if (id !== user.id && user.role === undefined && user.role !== UserRole.ADMIN) {
      return null;
    }

    Object.assign(userToUpdate, {
      ...(name !== undefined && { name }),
      ...(email !== undefined && userToUpdate.email !== email && { email }),
      ...(password !== undefined && {
        password: password === null ? null : await hash(password),
      }),
      ...(role !== undefined && { role }),
      ...(isVerified !== undefined && { isVerified })
    })

    return await this.usersRepository.save(userToUpdate);
  }

  async delete(id: string, user: User) {
    const userToDelete = await this.findOne({ id });
    
    if (!userToDelete) return null;

    // CHECK IF THE USER TRYING TO DELETE IS SELF, AND HAS SUFFICIENT PERMISSIONS
    if (id !== user.id && user.role === undefined && user.role !== UserRole.ADMIN) {
      return null;
    }

    await this.usersRepository.delete(id);
    
    return userToDelete;
  }

  async deleteMany(ids: string[], user: User) {
    
    // CHECK IF THE USER TRYING TO DELETE HAS SUFFICIENT PERMISSIONS
    if (user.role !== UserRole.ADMIN) {
      return null;
    }

    const users = await this.usersRepository.findBy({
      id: In(ids)
    });

    await this.usersRepository.delete({
      id: In(ids)
    });

    return users;
  }
}
