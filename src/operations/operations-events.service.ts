import {
  Injectable,
  OnModuleDestroy,
  OnModuleInit,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';
import { PrismaService } from '../database/prisma.service';
import { Client } from 'pg';

@Injectable()
export class OperationsEventsService implements OnModuleInit, OnModuleDestroy {
  private readonly connections = new Map<string, number>();
  private readonly wakeSubscribers = new Set<() => void>();
  private listener?: Client;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async onModuleInit(): Promise<void> {
    if (!this.config.get<boolean>('OPERATIONS_SSE')) return;
    const listener = new Client({
      connectionString: this.config.getOrThrow<string>('DATABASE_URL'),
    });
    try {
      await listener.connect();
      await listener.query('LISTEN operation_events');
      listener.on('notification', () => {
        this.wakeSubscribers.forEach((wake) => wake());
      });
      this.listener = listener;
    } catch {
      await listener.end().catch(() => undefined);
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.listener?.end().catch(() => undefined);
  }

  async connect(
    userId: string,
    lastEventId: bigint,
    response: Response,
  ): Promise<void> {
    if (!this.config.get<boolean>('OPERATIONS_SSE')) {
      throw new ServiceUnavailableException('Operational events are disabled.');
    }
    const count = this.connections.get(userId) ?? 0;
    if (count >= 3)
      throw new ServiceUnavailableException('SSE connection limit reached.');
    this.connections.set(userId, count + 1);

    response.setHeader('Content-Type', 'text/event-stream');
    response.setHeader('Cache-Control', 'no-cache, no-transform');
    response.setHeader('Connection', 'keep-alive');
    response.flushHeaders();

    let cursor = lastEventId;
    const sendPending = async () => {
      const events = await this.prisma.operationEvent.findMany({
        where: {
          id: { gt: cursor },
          createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        },
        orderBy: { id: 'asc' },
        take: 1001,
      });
      if (events.length > 1000) {
        response.write(
          `event: resync.required\ndata: {"reason":"replay_limit"}\n\n`,
        );
        cursor = events.at(-1)!.id;
        return;
      }
      for (const event of events) {
        response.write(`id: ${event.id.toString()}\n`);
        response.write(`event: ${event.type}\n`);
        response.write(
          `data: ${JSON.stringify({ entityType: event.entityType, entityId: event.entityId, version: event.version.toString(), related: event.related })}\n\n`,
        );
        cursor = event.id;
      }
    };

    await sendPending();
    const wake = () => void sendPending().catch(() => undefined);
    this.wakeSubscribers.add(wake);
    const poll = setInterval(wake, 2000);
    const heartbeat = setInterval(
      () => response.write(': heartbeat\n\n'),
      25_000,
    );
    response.on('close', () => {
      clearInterval(poll);
      clearInterval(heartbeat);
      this.wakeSubscribers.delete(wake);
      const current = this.connections.get(userId) ?? 1;
      if (current <= 1) this.connections.delete(userId);
      else this.connections.set(userId, current - 1);
    });
  }
}
