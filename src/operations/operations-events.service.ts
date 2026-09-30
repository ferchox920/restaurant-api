import {
  Injectable,
  OnModuleDestroy,
  OnModuleInit,
  ServiceUnavailableException,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';
import { PrismaService } from '../database/prisma.service';
import { Client } from 'pg';
import { Role, type OperationEvent } from '@prisma/client';
import { createHash } from 'node:crypto';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';

export const SSE_SESSION_CHECK_MS = 2000;
export const SSE_SESSION_DEADLINE_MS = 1000;
const roles = new Set<Role>([Role.ADMIN, Role.MANAGER, Role.CASHIER]);
const eventTypes: Record<string, string> = {
  'table-order.changed': 'TableOrder',
  'sale-ticket.changed': 'SaleTicket',
  'table.changed': 'RestaurantTable',
  'inventory.changed': 'ProductStock',
};

async function bounded<T>(
  operation: Promise<T>,
  milliseconds: number,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      operation,
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error('SSE database deadline')),
          milliseconds,
        );
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

@Injectable()
export class OperationsEventsService implements OnModuleInit, OnModuleDestroy {
  private readonly connections = new Map<string, number>();
  private readonly wakeSubscribers = new Set<() => void>();
  private readonly closers = new Set<() => void>();
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
    listener.on('error', () => {
      /* polling remains available if LISTEN fails */
    });
    try {
      await listener.connect();
      await listener.query('LISTEN operation_events');
      listener.on('notification', () =>
        this.wakeSubscribers.forEach((wake) => wake()),
      );
      this.listener = listener;
    } catch {
      await listener.end().catch(() => undefined);
    }
  }

  async onModuleDestroy(): Promise<void> {
    this.closers.forEach((close) => close());
    await this.listener?.end().catch(() => undefined);
  }

  async connect(
    user: AuthenticatedUser,
    lastEventId: bigint,
    response: Response,
  ): Promise<void> {
    if (!this.config.get<boolean>('OPERATIONS_SSE'))
      throw new ServiceUnavailableException('Operational events are disabled.');
    if (!roles.has(user.role))
      throw new ForbiddenException(
        'Operational stream requires an operational role.',
      );
    if (!user.sessionJti || !user.sessionExpiresAt)
      throw new UnauthorizedException(
        'SSE requires a persisted cookie session.',
      );
    const hash = createHash('sha256').update(user.sessionJti).digest('hex');
    let checking: Promise<boolean> | undefined;
    const validSession = (): Promise<boolean> => {
      if (checking) return checking;
      checking = bounded(
        this.prisma.authSession.findUnique({
          where: { jtiHash: hash },
          select: {
            userId: true,
            revokedAt: true,
            expiresAt: true,
            user: { select: { active: true, role: true } },
          },
        }),
        SSE_SESSION_DEADLINE_MS,
      )
        .then((session) =>
          Boolean(
            session &&
            session.userId === user.id &&
            !session.revokedAt &&
            session.expiresAt > new Date() &&
            user.sessionExpiresAt! > new Date() &&
            session.user.active &&
            session.user.role === user.role,
          ),
        )
        .finally(() => {
          checking = undefined;
        });
      return checking;
    };
    let disconnected = response.destroyed || response.writableEnded;
    const initialDisconnect = () => {
      disconnected = true;
    };
    response.once('close', initialDisconnect);
    response.once('error', initialDisconnect);
    try {
      if (!(await validSession()))
        throw new UnauthorizedException('Invalid session.');
    } finally {
      response.removeListener('close', initialDisconnect);
      response.removeListener('error', initialDisconnect);
    }
    if (disconnected || response.destroyed || response.writableEnded) return;
    const count = this.connections.get(user.id) ?? 0;
    if (count >= 3)
      throw new ServiceUnavailableException('SSE connection limit reached.');
    this.connections.set(user.id, count + 1);
    let closed = false;
    let reading = false;
    let queued = false;
    let cursor = lastEventId;
    let poll: ReturnType<typeof setInterval> | undefined;
    let monitor: ReturnType<typeof setInterval> | undefined;
    let heartbeat: ReturnType<typeof setInterval> | undefined;
    let expiry: ReturnType<typeof setTimeout> | undefined;
    const close = () => {
      if (closed) return;
      closed = true;
      clearInterval(poll);
      clearInterval(monitor);
      clearInterval(heartbeat);
      clearTimeout(expiry);
      this.wakeSubscribers.delete(wake);
      this.closers.delete(close);
      response.removeListener('close', close);
      response.removeListener('error', close);
      const remaining = (this.connections.get(user.id) ?? 1) - 1;
      if (remaining > 0) this.connections.set(user.id, remaining);
      else this.connections.delete(user.id);
      try {
        response.end();
      } catch {
        /* cleanup still completes */
      }
    };
    const write = (frame: string) => {
      if (closed) return;
      if (user.sessionExpiresAt! <= new Date()) {
        invalidate();
        return;
      }
      response.write(frame);
    };
    const invalidate = () => {
      if (closed) return;
      try {
        response.write(
          'event: session.invalid\ndata: {"reason":"session_or_permissions_changed"}\n\n',
        );
      } finally {
        close();
      }
    };
    const resync = async (reason: string) => {
      const latest = await bounded(
        this.prisma.operationEvent.findFirst({
          orderBy: { id: 'desc' },
          select: { id: true },
        }),
        5000,
      );
      if (closed) return;
      cursor = latest?.id ?? 0n;
      write(
        `id: ${cursor.toString()}\nevent: resync.required\ndata: ${JSON.stringify({ reason })}\n\n`,
      );
    };
    const send = (event: OperationEvent) => {
      if (
        eventTypes[event.type] !== event.entityType ||
        (event.type === 'inventory.changed' && user.role === Role.CASHIER)
      )
        return;
      const related: Record<string, string> = {};
      if (
        event.related &&
        typeof event.related === 'object' &&
        !Array.isArray(event.related)
      ) {
        for (const key of [
          'restaurantTableId',
          'saleTicketId',
          'tableOrderId',
          'productId',
        ]) {
          const value = event.related[key];
          if (typeof value === 'string') related[key] = value;
        }
      }
      write(
        `id: ${event.id.toString()}\nevent: ${event.type}\ndata: ${JSON.stringify({ entityType: event.entityType, entityId: event.entityId, version: event.version.toString(), related })}\n\n`,
      );
    };
    const drain = async () => {
      if (closed) return;
      if (reading) {
        queued = true;
        return;
      }
      reading = true;
      try {
        do {
          queued = false;
          if (!(await validSession())) {
            invalidate();
            return;
          }
          if (closed) return;
          const events = await bounded(
            this.prisma.operationEvent.findMany({
              where: {
                id: { gt: cursor },
                createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
              },
              orderBy: { id: 'asc' },
              take: 1001,
            }),
            5000,
          );
          if (closed) return;
          if (events.length > 1000) await resync('replay_limit');
          else
            for (const event of events) {
              if (closed) break;
              if (event.id <= cursor) continue;
              send(event);
              cursor = event.id;
            }
        } while (queued && !closed);
      } finally {
        reading = false;
      }
    };
    const wake = () => {
      void drain().catch(close);
    };
    response.once('close', close);
    response.once('error', close);
    this.closers.add(close);
    try {
      response.setHeader('Content-Type', 'text/event-stream');
      response.setHeader('Cache-Control', 'no-cache, no-transform');
      response.setHeader('Connection', 'keep-alive');
      response.setTimeout?.(0);
      response.flushHeaders();
      monitor = setInterval(() => {
        void validSession()
          .then((valid) => {
            if (!valid) invalidate();
          })
          .catch(close);
      }, SSE_SESSION_CHECK_MS);
      expiry = setTimeout(
        () => {
          if (user.sessionExpiresAt! <= new Date()) invalidate();
        },
        Math.min(
          Math.max(0, user.sessionExpiresAt.getTime() - Date.now()),
          2147483647,
        ),
      );
      if (cursor > 0n) {
        const saved = await bounded(
          this.prisma.operationEvent.findUnique({
            where: { id: cursor },
            select: { createdAt: true },
          }),
          5000,
        );
        if (
          !saved ||
          saved.createdAt.getTime() < Date.now() - 24 * 60 * 60 * 1000
        )
          await resync(saved ? 'cursor_expired' : 'cursor_unknown');
      }
      if (closed) return;
      await drain();
      if (closed) return;
      this.wakeSubscribers.add(wake);
      poll = setInterval(wake, 2000);
      heartbeat = setInterval(() => {
        try {
          write(': heartbeat\n\n');
        } catch {
          close();
        }
      }, 25_000);
    } catch {
      close();
    }
  }
}
