import { Field, ObjectType } from '@nestjs/graphql';
import {
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  type Relation,
  RelationId,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { Attempt } from './attempt.entity';
import { McqOption } from './mcq-option.entity';
import { Question } from './question.entity';

@Entity('attempt_mcq_answers')
@Unique(['attempt', 'question'])
@ObjectType()
export class AttemptMcqAnswer {
  @PrimaryGeneratedColumn('uuid')
  @Field()
  id: string;

  @ManyToOne(
    () => Attempt,
    (attempt) => attempt.attemptMcqAnswers,
    {
      nullable: false,
      onDelete: 'CASCADE',
    },
  )
  @JoinColumn({ name: 'attempt_id' })
  attempt: Relation<Attempt>;

  @RelationId((answer: AttemptMcqAnswer) => answer.attempt)
  attemptId: string;

  @ManyToOne(
    () => Question,
    (question) => question.attemptMcqAnswers,
    {
      nullable: false,
      onDelete: 'CASCADE',
    },
  )
  @JoinColumn({ name: 'question_id' })
  question: Relation<Question>;

  @RelationId((answer: AttemptMcqAnswer) => answer.question)
  questionId: string;

  @ManyToOne(
    () => McqOption,
    (option) => option.attemptMcqAnswers,
    {
      nullable: false,
      onDelete: 'CASCADE',
    },
  )
  @JoinColumn({ name: 'option_id' })
  option: Relation<McqOption>;

  @RelationId((answer: AttemptMcqAnswer) => answer.option)
  optionId: string;

  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamptz',
  })
  @Field()
  createdAt: Date;

  @UpdateDateColumn({
    name: 'updated_at',
    type: 'timestamptz',
  })
  @Field()
  updatedAt: Date;
}
