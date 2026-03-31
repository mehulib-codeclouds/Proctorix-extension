import { Field, ObjectType, registerEnumType } from '@nestjs/graphql';
import {
  Column, CreateDateColumn, Entity,
  JoinColumn, ManyToOne, PrimaryGeneratedColumn,
  type Relation, RelationId,
} from 'typeorm';
import { Attempt } from './attempt.entity';

export enum ProctoringEventType {
  EXAM_STARTED    = 'exam_started',
  TAB_SWITCH      = 'tab_switch',
  WINDOW_BLUR     = 'window_blur',
  FULLSCREEN_EXIT = 'fullscreen_exit',
  FULLSCREEN_ENTER = 'fullscreen_enter',
  RIGHT_CLICK     = 'right_click',
  COPY_ATTEMPT    = 'copy_attempt',
  PASTE_ATTEMPT   = 'paste_attempt',
  EXAM_ENDED      = 'exam_ended',
}

registerEnumType(ProctoringEventType, { name: 'ProctoringEventType' });

@Entity('proctoring_events')
@ObjectType()
export class ProctorEvent {
  @PrimaryGeneratedColumn('uuid')
  @Field() id: string;

  @ManyToOne(() => Attempt, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'attempt_id' })
  attempt: Relation<Attempt>;

  @RelationId((e: ProctorEvent) => e.attempt)
  attemptId: string;

  @Column({ name: 'event_type', type: 'enum', enum: ProctoringEventType, enumName: 'proctoring_event_type_enum' })
  @Field(() => ProctoringEventType)
  eventType: ProctoringEventType;

  @Column({ name: 'metadata', type: 'jsonb', nullable: true })
  @Field(() => String, { nullable: true })
  metadata: Record<string, unknown> | null;

  @Column({ name: 'occurred_at', type: 'timestamptz' })
  @Field() occurredAt: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  @Field() createdAt: Date;
}