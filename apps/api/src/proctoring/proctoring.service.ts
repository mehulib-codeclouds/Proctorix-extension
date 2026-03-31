import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { ProctorEvent, ProctoringEventType } from '../entities/proctor-event.entity';
@Injectable()
export class ProctoringService {
  constructor(
    @InjectRepository(ProctorEvent)
    private readonly repo: Repository<ProctorEvent>,
  ) {}

  async recordEvent({
    attemptId,
    eventType,
    metadata,
    occurredAt,
  }: {
    attemptId: string;
    eventType: ProctoringEventType;
    metadata?: Record<string, unknown>;
    occurredAt?: Date;
  }): Promise<ProctorEvent> {
    const event = this.repo.create({
      attempt: { id: attemptId },
      eventType,
      metadata: metadata ?? null,
      occurredAt: occurredAt ?? new Date(),
    });
    return this.repo.save(event);
  }

  async getEventsForAttempt(attemptId: string): Promise<ProctorEvent[]> {
    return this.repo.find({
      where: { attempt: { id: attemptId } },
      order: { occurredAt: 'ASC' },
    });
  }

  async getSummaryForAttempt(attemptId: string) {
    const events = await this.getEventsForAttempt(attemptId);
    const counts: Record<string, number> = {};
    for (const e of events) {
      counts[e.eventType] = (counts[e.eventType] ?? 0) + 1;
    }
    return { attemptId, totalEvents: events.length, counts };
  }
}