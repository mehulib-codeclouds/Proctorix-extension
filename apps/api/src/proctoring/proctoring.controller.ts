import { Body, Controller, Post, Headers, UnauthorizedException } from '@nestjs/common';
import { ProctoringService } from './proctoring.service';
import { ProctoringEventType } from '../entities/proctor-event.entity';
import { SessionsService } from '../auth/sessions/sessions.service';

interface BatchEventDto {
  events: Array<{
    attemptId: string;
    sessionId: string;
    eventType: ProctoringEventType;
    metadata?: Record<string, unknown>;
    occurredAt?: string;
  }>;
}

@Controller('proctoring')
export class ProctoringController {
  constructor(
    private readonly proctoringService: ProctoringService,
    private readonly sessionsService: SessionsService,
  ) {}

  @Post('events/batch')
  async batchEvents(
    @Body() body: BatchEventDto,
    @Headers('authorization') auth: string,
  ) {
    // Verify session from Authorization header
    const sessionId = auth?.replace('Bearer ', '');
    if (!sessionId) throw new UnauthorizedException();

    const session = await this.sessionsService.findOne(sessionId);
    if (!session) throw new UnauthorizedException();

    // Save all events — fire and forget style per event
    const results = await Promise.allSettled(
      body.events.map((e) =>
        this.proctoringService.recordEvent({
          attemptId: e.attemptId,
          eventType: e.eventType,
          metadata: e.metadata,
          occurredAt: e.occurredAt ? new Date(e.occurredAt) : undefined,
        }),
      ),
    );

    const saved = results.filter((r) => r.status === 'fulfilled').length;
    return { saved, total: body.events.length };
  }
}