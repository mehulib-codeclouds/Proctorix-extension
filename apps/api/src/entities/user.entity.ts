import { Field, ObjectType, registerEnumType } from '@nestjs/graphql';
import {
  Column,
  CreateDateColumn,
  Entity,
  Generated,
  OneToMany,
  PrimaryGeneratedColumn,
  type Relation,
  UpdateDateColumn,
} from 'typeorm';
import { Attempt } from './attempt.entity';
import { Exam } from './exam.entity';
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

  @Column({ name: 'email', length: 254, nullable: false, unique: true })
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

  @OneToMany(
    () => Exam,
    (exam) => exam.createdBy,
  )
  exams: Relation<Exam>[];

  @OneToMany(
    () => Attempt,
    (attempt) => attempt.candidate,
  )
  attempts: Relation<Attempt>[];

  @Column({ name: 'is_verified', default: false, nullable: false })
  @Field()
  isVerified: boolean;

  @Generated('uuid')
  @Column({ name: 'verification_token', unique: true, nullable: false })
  @Field()
  verificationToken: string;

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
