import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { hash } from 'argon2';
import { Equal, type Repository } from 'typeorm';
import { User, UserRole } from '/entities/user.entity';

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

  async findMany() {
    return await this.usersRepository.find();
  }

  async create({
    name,
    email,
    password,
    role,
    isVerified,
  }: {
    name: string;
    email: string;
    password?: string | null;
    role?: UserRole | undefined;
    isVerified?: boolean | undefined;
  }) {
    const user = this.usersRepository.create({
      name,
      email,
      ...(password !== undefined && {
        password: password === null ? null : await hash(password),
      }),
      ...(role !== undefined && { role }),
      ...(isVerified !== undefined && { isVerified }),
    });
    return await this.usersRepository.save(user);
  }

  async update(
    input: {
      id: string;
      name?: string | undefined;
      email?: string | undefined;
      password?: string | null;
      role?: UserRole | undefined;
      isVerified?: boolean | undefined;
    },
    user: User,
  ) {
    const { id, name, email, password, role, isVerified } = input;

    const userToUpdate = await this.findOne({ id });
    if (!userToUpdate) return null;
    if (id !== user.id && user.role !== UserRole.ADMIN) return null;

    if (name !== undefined) userToUpdate.name = name;
    if (email !== undefined) userToUpdate.email = email;
    if (password !== undefined)
      userToUpdate.password = password === null ? null : await hash(password);
    if (role !== undefined) userToUpdate.role = role;
    if (isVerified !== undefined) userToUpdate.isVerified = isVerified;

    return await this.usersRepository.save(userToUpdate);
  }
}
