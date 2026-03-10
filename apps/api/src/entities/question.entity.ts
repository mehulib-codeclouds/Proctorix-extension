import { Field, ObjectType } from '@nestjs/graphql';
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
  durationMinutes: number | null;

  @Column({ name: 'marks', type: 'smallint', nullable: false })
  marks: number | null;

  @ManyToOne(
    () => Exam,
    (exam) => exam.questions,
    { nullable: false, onDelete: 'CASCADE' },
  )
  @JoinColumn({ name: 'exam_id' })
  exam: Relation<Exam>;

  @RelationId((question: Question) => question.exam)
  examId: string;

  @OneToMany(
    () => McqOption,
    (mcqOption) => mcqOption.question,
  )
  mcqOptions: Relation<McqOption>[];

  @OneToMany(
    () => MsqOption,
    (msqOption) => msqOption.question,
  )
  msqOptions: Relation<MsqOption>[];

  @OneToOne(
    () => McqAnswer,
    (mcqAnswer) => mcqAnswer.question,
  )
  mcqAnswer: Relation<McqAnswer>;

  @OneToMany(
    () => MsqAnswer,
    (msqAnswer) => msqAnswer.question,
  )
  msqAnswers: Relation<McqAnswer>;

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
