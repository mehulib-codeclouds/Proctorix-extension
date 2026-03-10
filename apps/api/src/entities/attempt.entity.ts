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
import { AttemptMcqAnswer } from './attempt-mcq-answer.entity';
import { AttemptMsqAnswer } from './attempt-msq-answer.entity';
import { Exam } from './exam.entity';
import { User } from './user.entity';

@Entity('attempts')
@ObjectType()
export class Attempt {
  @Column({ name: 'id' })
  @PrimaryGeneratedColumn('uuid')
  @Field()
  id: string;

  @ManyToOne(
    () => Exam,
    (exam) => exam.attempts,
    { nullable: false, onDelete: 'CASCADE' },
  )
  @JoinColumn({ name: 'exam_id' })
  exam: Relation<Exam>;

  @RelationId((attempt: Attempt) => attempt.exam)
  examId: string;

  @ManyToOne(
    () => User,
    (user) => user.attempts,
    { nullable: false, onDelete: 'CASCADE' },
  )
  @JoinColumn({ name: 'candidate_id' })
  candidate: Relation<User>;

  @RelationId((attempt: Attempt) => attempt.candidate)
  candidateId: string;

  @OneToMany(
    () => AttemptMcqAnswer,
    (attemptMcqAnswer) => attemptMcqAnswer.attempt,
  )
  attemptMcqAnswers: Relation<AttemptMcqAnswer>[];

  @OneToMany(
    () => AttemptMsqAnswer,
    (attemptMsqAnswer) => attemptMsqAnswer.attempt,
  )
  attemptMsqAnswers: Relation<AttemptMsqAnswer>[];

  @CreateDateColumn({
    name: 'started_at',
    type: 'timestamptz',
    nullable: false,
  })
  @Field()
  startedAt: Date;

  @Column({ name: 'ended_at', type: 'timestamptz', nullable: true })
  @Field()
  endedAt: Date | null;

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
