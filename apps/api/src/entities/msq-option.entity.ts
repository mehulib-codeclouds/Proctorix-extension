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
import { AttemptMsqAnswer } from './attempt-msq-answer.entity';
import { MsqAnswer } from './msq-answer.entity';
import { Question } from './question.entity';

@Entity('msq_options')
@ObjectType()
export class MsqOption {
  @Column({ name: 'id' })
  @PrimaryGeneratedColumn('uuid')
  @Field()
  id: string;

  @Column({ name: 'text', type: 'text', nullable: false })
  @Field()
  text: string;

  @Column({ name: 'has_partial_marking', nullable: false })
  @Field()
  hasPartialMarking: boolean;

  @ManyToOne(
    () => Question,
    (question) => question.msqOptions,
    { nullable: false, onDelete: 'CASCADE' },
  )
  @JoinColumn({ name: 'question_id' })
  question: Relation<Question>;

  @RelationId((mcqOption: MsqOption) => mcqOption.question)
  questionId: string;

  @OneToMany(
    () => MsqAnswer,
    (msqAnswer) => msqAnswer.option,
  )
  answers: Relation<MsqAnswer>[];

  @OneToMany(
    () => AttemptMsqAnswer,
    (attemptMsqAnswer) => attemptMsqAnswer.option,
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