import {
  WebSocketGateway, WebSocketServer,
  SubscribeMessage, MessageBody,
  ConnectedSocket, OnGatewayConnection, OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Inject, UseGuards } from '@nestjs/common';
import { ProctoringService } from './proctoring.service';
import { ProctoringEventType } from '../entities/proctor-event.entity';
import { SessionsService } from '../auth/sessions/sessions.service';

interface ProctoringEventPayload {
  attemptId: string;
  sessionId: string;
  eventType: ProctoringEventType;
  metadata?: Record<string, unknown>;
  occurredAt?: string;
}

@WebSocketGateway({
  cors: { origin: '*' },   // tighten in production to your frontend URL
  namespace: '/proctoring',
})
export class ProctoringGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;

  constructor(
    @Inject(ProctoringService) private readonly proctoringService: ProctoringService,
    @Inject(SessionsService)   private readonly sessionsService: SessionsService,
  ) {}

  async handleConnection(client: Socket) {
    const sessionId = client.handshake.auth?.sessionId as string | undefined;
    if (!sessionId) { client.disconnect(); return; }
    const session = await this.sessionsService.findOne(sessionId);
    if (!session) { client.disconnect(); return; }
    // attach userId to socket for later use
    (client as any).userId = session.userId;
  }

  handleDisconnect(client: Socket) {
    // cleanup if needed
  }

  @SubscribeMessage('proctor_event')
  async handleProctoringEvent(
    @MessageBody() data: ProctoringEventPayload,
    @ConnectedSocket() client: Socket,
  ) {
    // Verify the session matches the socket
    const session = await this.sessionsService.findOne(data.sessionId);
    if (!session || session.userId !== (client as any).userId) return;

    await this.proctoringService.recordEvent({
      attemptId: data.attemptId,
      eventType: data.eventType,
      metadata: data.metadata,
      occurredAt: data.occurredAt ? new Date(data.occurredAt) : undefined,
    });

    // Notify admin room if connected (for live proctoring dashboard)
    this.server.to(`admin:${data.attemptId}`).emit('live_event', data);
  }

  @SubscribeMessage('admin_watch')
  async handleAdminWatch(
    @MessageBody() data: { attemptId: string; sessionId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const session = await this.sessionsService.findOne(data.sessionId);
    if (!session) return;
    client.join(`admin:${data.attemptId}`);
  }
}