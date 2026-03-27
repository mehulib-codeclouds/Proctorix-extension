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
import { McqAnswer } from './mcq-answer.entity';
import { Question } from './question.entity';

@Entity('mcq_options')
@ObjectType()
export class McqOption {
  @Column({ name: 'id' })
  @PrimaryGeneratedColumn('uuid')
  @Field()
  id: string;

  @ManyToOne(
    () => Question,
    (question) => question.mcqOptions,
    { nullable: false, onDelete: 'CASCADE' },
  )
  @JoinColumn({ name: 'question_id' })
  question: Relation<Question>;

  @RelationId((mcqOption: McqOption) => mcqOption.question)
  questionId: string;

  @Column({ name: 'text', type: 'text', nullable: false })
  @Field()
  text: string;

  @OneToOne(
    () => McqAnswer,
    (mcqAnswer) => mcqAnswer.option,
  )
  answer: Relation<McqAnswer>;

  @OneToMany(
    () => AttemptMcqAnswer,
    (attemptMcqAnswer) => attemptMcqAnswer.option,
  )
  attemptMcqAnswers: Relation<AttemptMcqAnswer>[];

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