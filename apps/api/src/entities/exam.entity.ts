import { Field, ObjectType } from '@nestjs/graphql';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  type Relation,
  RelationId,
  UpdateDateColumn,
} from 'typeorm';
import { Attempt } from './attempt.entity';
import { Question } from './question.entity';
import { User } from './user.entity';

@Entity('exams')
@ObjectType()
export class Exam {
  @Column({ name: 'id' })
  @PrimaryGeneratedColumn('uuid')
  @Field()
  id: string;

  @Column({ name: 'title', length: 255, nullable: false })
  @Field()
  title: string;

  @Column({ name: 'description', length: 512, nullable: false })
  @Field()
  description: string;

  @Column({ name: 'duration_minutes', type: 'integer', nullable: true })
  @Field({ nullable: true })
  durationMinutes: number | null;

  @Column({ name: 'start_time', type: 'timestamptz', nullable: false })
  @Field()
  startTime: Date;

  @Column({ name: 'end_time', type: 'timestamptz', nullable: false })
  @Field()
  endTime: Date;

  @Column({ name: 'passing_marks', type: 'integer', nullable: true })
  @Field({ nullable: true })
  passingMarks: number | null;

  @Column({ name: 'attempts_allowed', type: 'smallint', nullable: false })
  @Field()
  attemptsAllowed: number;

  @ManyToOne(
    () => User,
    (user) => user.sessions,
    { nullable: false, onDelete: 'CASCADE' },
  )
  @JoinColumn({ name: 'created_by_id' })
  createdBy: Relation<User>;

  @RelationId((exam: Exam) => exam.createdBy)
  createdById: string;

  @OneToMany(
    () => Question,
    (question) => question.exam,
  )
  questions: Relation<Exam>[];

  @OneToMany(
    () => Attempt,
    (attempt) => attempt.exam,
  )
  attempts: Relation<Attempt>[];

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
