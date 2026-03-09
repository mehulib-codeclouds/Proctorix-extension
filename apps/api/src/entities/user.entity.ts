import { Field, ObjectType, registerEnumType } from '@nestjs/graphql';
import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  type Relation,
  UpdateDateColumn,
} from 'typeorm';
import { Session } from './session.entity';

export enum UserRole {
  ADMIN = 'admin',
  EXAMINER = 'examiner',
  CANDIDATE = 'candidate',
}

registerEnumType(UserRole, {
  name: 'UserRole',
});

@Entity('users')
@ObjectType()
export class User {
  @Column({ name: 'id' })
  @PrimaryGeneratedColumn('uuid')
  @Field()
  id: string;

  @Column({ name: 'name', length: 255, nullable: false })
  @Field()
  name: string;

  @Column({ name: 'email', length: 254, nullable: false })
  @Field()
  email: string;

  @Column({ name: 'password', type: 'char', length: 97, nullable: true })
  password: string | null;

  @Column({
    name: 'role',
    type: 'enum',
    enum: UserRole,
    default: UserRole.CANDIDATE,
  })
  @Field(() => UserRole)
  role: UserRole;

  @OneToMany(
    () => Session,
    (session) => session.user,
  )
  sessions: Relation<Session>[];

  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamptz',
    nullable: false,
  })
  @Field()
  createdAt: Date;

  @UpdateDateColumn({
    name: 'updated_at',
    type: 'timestamptz',
    nullable: false,
  })
  @Field()
  updatedAt: Date;
}
