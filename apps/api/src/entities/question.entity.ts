import { Field, Int, ObjectType } from '@nestjs/graphql';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  type Relation,
  RelationId,
  UpdateDateColumn,
} from 'typeorm';
import { AttemptMcqAnswer } from './attempt-mcq-answer.entity';
import { AttemptMsqAnswer } from './attempt-msq-answer.entity';
import { Exam } from './exam.entity';
import { McqAnswer } from './mcq-answer.entity';
import { McqOption } from './mcq-option.entity';
import { MsqAnswer } from './msq-answer.entity';
import { MsqOption } from './msq-option.entity';

export enum QuestionType {
  MCQ = 'mcq',
  MSQ = 'msq',
}

@Entity('questions')
@ObjectType()
export class Question {
  @Column({ name: 'id' })
  @PrimaryGeneratedColumn('uuid')
  @Field()
  id: string;

  @Column({ name: 'text', type: 'text', nullable: false })
  @Field()
  text: string;

  @Column({
    name: 'type',
    type: 'enum',
    enum: QuestionType,
    nullable: false,
  })
  type: QuestionType;

  @Column({ name: 'duration_minutes', type: 'integer', nullable: true })
  @Field(() => Int, { nullable: true })
  durationMinutes: number | null;

  @Column({ name: 'marks', type: 'smallint', nullable: false })
  @Field(() => Int)
  marks: number | null;

  @ManyToOne(
    () => Exam,
    (exam) => exam.questions,
    { nullable: false, onDelete: 'CASCADE' },
  )
  @JoinColumn({ name: 'exam_id' })
  exam: Relation<Exam>;

  @RelationId((question: Question) => question.exam)
  @Field()
  examId: string;

  @OneToMany(
    () => McqOption,
    (mcqOption) => mcqOption.question,
  )
  @Field(() => [McqOption], { nullable: true })
  mcqOptions: Relation<McqOption>[];

  @OneToMany(
    () => MsqOption,
    (msqOption) => msqOption.question,
  )
  @Field(() => [MsqOption], { nullable: true })
  msqOptions: Relation<MsqOption>[];

  @OneToOne(
    () => McqAnswer,
    (mcqAnswer) => mcqAnswer.question,
  )
  @Field(() => McqAnswer, { nullable: true })
  mcqAnswer: Relation<McqAnswer>;

  @OneToMany(
    () => MsqAnswer,
    (msqAnswer) => msqAnswer.question,
  )
  @Field(() => [MsqAnswer], { nullable: true })
  msqAnswers: Relation<MsqAnswer>[];

  @OneToMany(
    () => AttemptMcqAnswer,
    (attemptMcqAnswer) => attemptMcqAnswer.question,
  )
  attemptMcqAnswers: Relation<AttemptMcqAnswer>[];

  @OneToMany(
    () => AttemptMsqAnswer,
    (attemptMsqAnswer) => attemptMsqAnswer.question,
  )
  attemptMsqAnswers: Relation<AttemptMsqAnswer>[];

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