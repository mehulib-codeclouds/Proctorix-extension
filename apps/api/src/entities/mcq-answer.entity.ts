import { Field, ObjectType } from '@nestjs/graphql';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  type Relation,
  RelationId,
  UpdateDateColumn,
} from 'typeorm';
import { McqOption } from './mcq-option.entity';
import { Question } from './question.entity';

@Entity('mcq_answers')
@ObjectType()
export class McqAnswer {
  @Column({ name: 'id' })
  @PrimaryGeneratedColumn('uuid')
  @Field()
  id: string;

  @OneToOne(
    () => Question,
    (question) => question.mcqAnswer,
    { nullable: false, onDelete: 'CASCADE' },
  )
  @JoinColumn({ name: 'question_id' })
  question: Relation<Question>;

  @RelationId((mcqAnswer: McqAnswer) => mcqAnswer.question)
  questionId: string;

  @OneToOne(
    () => McqOption,
    (mcqOption) => mcqOption.answer,
    { nullable: false, onDelete: 'CASCADE' },
  )
  @JoinColumn({ name: 'option_id' })
  option: Relation<McqOption>;

  @RelationId((mcqAnswer: McqAnswer) => mcqAnswer.option)
  @Field()
  optionId: string;

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
