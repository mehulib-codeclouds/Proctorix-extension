import { Field, ObjectType } from '@nestjs/graphql';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
  type Relation,
  RelationId,
  UpdateDateColumn,
} from 'typeorm';
import { MsqOption } from './msq-option.entity';
import { Question } from './question.entity';

@Entity('msq_answers')
@ObjectType()
export class MsqAnswer {
  @Column({ name: 'id' })
  @PrimaryGeneratedColumn('uuid')
  @Field()
  id: string;

  @ManyToOne(
    () => Question,
    (question) => question.msqAnswers,
    { nullable: false, onDelete: 'CASCADE' },
  )
  @JoinColumn({ name: 'question_id' })
  question: Relation<Question>;

  @RelationId((mcqAnswer: MsqAnswer) => mcqAnswer.question)
  questionId: string;

  @OneToOne(
    () => MsqOption,
    (msqOption) => msqOption.answers,
    { nullable: false, onDelete: 'CASCADE' },
  )
  @JoinColumn({ name: 'option_id' })
  option: Relation<MsqOption>;

  @RelationId((msqOption: MsqAnswer) => msqOption.option)
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
