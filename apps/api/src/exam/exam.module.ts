import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Exam } from '/entities/exam.entity';
import { User } from '/entities/user.entity';
import { ExamsService } from './exams/exams.service';

@Module({
  imports: [TypeOrmModule.forFeature([Exam, User])],
  providers: [ExamsService],
  exports: [ExamsService],
})
export class ExamsModule {}
