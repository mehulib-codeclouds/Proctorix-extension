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
import { MsqOption } from './msq-option.entity';
import { Question } from './question.entity';

@Entity('attempt_msq_answers')
@Unique(['attempt', 'question', 'option'])
@ObjectType()
export class AttemptMsqAnswer {
  @PrimaryGeneratedColumn('uuid')
  @Field()
  id: string;

  @ManyToOne(
    () => Attempt,
    (attempt) => attempt.attemptMsqAnswers,
    {
      nullable: false,
      onDelete: 'CASCADE',
    },
  )
  @JoinColumn({ name: 'attempt_id' })
  attempt: Relation<Attempt>;

  @RelationId((answer: AttemptMsqAnswer) => answer.attempt)
  attemptId: string;

  @ManyToOne(
    () => Question,
    (question) => question.attemptMsqAnswers,
    {
      nullable: false,
      onDelete: 'CASCADE',
    },
  )
  @JoinColumn({ name: 'question_id' })
  question: Relation<Question>;

  @RelationId((answer: AttemptMsqAnswer) => answer.question)
  questionId: string;

  @ManyToOne(
    () => MsqOption,
    (option) => option.attemptMsqAnswers,
    {
      nullable: false,
      onDelete: 'CASCADE',
    },
  )
  @JoinColumn({ name: 'option_id' })
  option: Relation<MsqOption>;

  @RelationId((answer: AttemptMsqAnswer) => answer.option)
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
