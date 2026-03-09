import { Field, ObjectType } from '@nestjs/graphql';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  type Relation,
  RelationId,
  UpdateDateColumn,
} from 'typeorm';
import { User } from './user.entity';

@Entity('sessions')
@ObjectType()
export class Session {
  @Column({ name: 'id' })
  @PrimaryGeneratedColumn('uuid')
  @Field()
  id: string;

  @ManyToOne(
    () => User,
    (user) => user.sessions,
    { nullable: false, onDelete: 'CASCADE' },
  )
  @JoinColumn({ name: 'user_id' })
  user: Relation<User>;

  @RelationId((session: Session) => session.user)
  userId: string;

  @CreateDateColumn({
    name: 'last_used_at',
    type: 'timestamptz',
    nullable: false,
  })
  @Field()
  lastUsedAt: Date;

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
