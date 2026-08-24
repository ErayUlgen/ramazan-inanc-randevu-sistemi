import { Controller, MessageEvent, Req, Sse, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { Observable } from 'rxjs';
import {
  AdminSessionGuard,
  type AdminRequest,
} from '../admin/admin-session.guard';
import { PrismaService } from '../prisma/prisma.service';
import { AdminRole } from '@prisma/client';
import { AdminRoles } from '../admin/admin-authorization';

@Controller('admin/events')
@UseGuards(AdminSessionGuard)
@AdminRoles(AdminRole.RECEPTIONIST)
export class AdminRealtimeController {
  constructor(private readonly prisma: PrismaService) {}

  @Sse()
  stream(@Req() request: AdminRequest & Request): Observable<MessageEvent> {
    const branchId = request.adminIdentity?.branchId;
    const lastEventId = request.header('last-event-id');
    return new Observable<MessageEvent>((subscriber) => {
      let closed = false;
      let polling = false;
      let cursorAt = new Date(Date.now() - 15_000);
      const delivered = new Set<string>();

      const poll = async () => {
        if (closed || polling || !branchId) return;
        polling = true;
        try {
          if (lastEventId && delivered.size === 0) {
            const previous = await this.prisma.adminRealtimeEvent.findUnique({
              where: { id: lastEventId },
              select: { id: true, createdAt: true },
            });
            if (previous?.createdAt) cursorAt = previous.createdAt;
          }
          const events = await this.prisma.adminRealtimeEvent.findMany({
            where: { branchId, createdAt: { gte: cursorAt } },
            orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
            take: 100,
          });
          for (const event of events) {
            if (delivered.has(event.id) || event.id === lastEventId) continue;
            delivered.add(event.id);
            cursorAt = event.createdAt;
            subscriber.next({
              id: event.id,
              type: 'resource-changed',
              data: {
                resourceType: event.resourceType,
                resourceId: event.resourceId,
                action: event.action,
                occurredAt: event.createdAt.toISOString(),
              },
            });
          }
          if (delivered.size > 500) delivered.clear();
        } catch {
          subscriber.next({
            type: 'stream-status',
            data: { state: 'degraded' },
          });
        } finally {
          polling = false;
        }
      };

      subscriber.next({
        type: 'stream-status',
        data: { state: 'connected' },
      });
      void poll();
      const pollTimer = setInterval(() => void poll(), 2_500);
      const heartbeat = setInterval(
        () =>
          subscriber.next({
            type: 'heartbeat',
            data: { at: new Date().toISOString() },
          }),
        20_000,
      );
      return () => {
        closed = true;
        clearInterval(pollTimer);
        clearInterval(heartbeat);
      };
    });
  }
}
