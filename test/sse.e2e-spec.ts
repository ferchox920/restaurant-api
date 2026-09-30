import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Role } from '@prisma/client';
import { createHash, randomUUID } from 'node:crypto';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';

describe('SSE persisted cookie sessions over real HTTP and PostgreSQL', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let url: string;
  const users: string[] = [];
  const events: bigint[] = [];
  const connections: AbortController[] = [];

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = module.createNestApplication();
    app.setGlobalPrefix('api');
    app.get(ConfigService).set('OPERATIONS_SSE', true);
    app.get(ConfigService).set('AUTH_COOKIE', true);
    await app.listen(0, '127.0.0.1');
    prisma = app.get(PrismaService);
    url = `${await app.getUrl()}/api/operations/events`;
  });

  afterAll(async () => {
    connections.forEach((controller) => controller.abort());
    await prisma.operationEvent.deleteMany({ where: { id: { in: events } } });
    await prisma.user.deleteMany({ where: { id: { in: users } } });
    await app.close();
  });

  async function session(role: Role = Role.ADMIN, seconds = 60) {
    const user = await prisma.user.create({
      data: {
        email: `${randomUUID()}@example.com`,
        firstName: 'SSE',
        lastName: 'Fixture',
        passwordHash: 'unused',
        role,
      },
    });
    users.push(user.id);
    const jti = randomUUID();
    const token = await app
      .get(JwtService)
      .signAsync(
        { sub: user.id, email: user.email, role, jti },
        { expiresIn: seconds },
      );
    const record = await prisma.authSession.create({
      data: {
        userId: user.id,
        jtiHash: createHash('sha256').update(jti).digest('hex'),
        expiresAt: new Date(Date.now() + seconds * 1000),
      },
    });
    return { user, record, token, cookie: `restaurant_session=${token}` };
  }

  function open(cookie: string, extra: Record<string, string> = {}) {
    const controller = new AbortController();
    connections.push(controller);
    return fetch(url, {
      headers: { cookie, ...extra },
      signal: controller.signal,
    });
  }

  async function readToClose(response: Response) {
    const reader = response.body!.getReader();
    let text = '';
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) return text;
      text += new TextDecoder().decode(chunk.value);
    }
  }

  it('rejects anonymous requests, arbitrary cookies and bearer disguised as cookie authentication', async () => {
    expect((await fetch(url)).status).toBe(401);
    expect((await open('restaurant_session=arbitrary')).status).toBe(401);
    const fixture = await session();
    expect(
      (
        await open('restaurant_session=arbitrary', {
          authorization: `Bearer ${fixture.token}`,
        })
      ).status,
    ).toBe(401);
  });

  it('rejects an authenticated auditor before opening a stream', async () => {
    const fixture = await session(Role.AUDITOR);
    expect((await open(fixture.cookie)).status).toBe(403);
  });

  it.each(['revoked', 'inactive', 'role'] as const)(
    'closes an existing stream within 3000 ms after %s changes',
    async (change) => {
      const fixture = await session();
      const response = await open(fixture.cookie);
      expect(response.status).toBe(200);
      const closed = readToClose(response);
      if (change === 'revoked')
        await prisma.authSession.update({
          where: { id: fixture.record.id },
          data: { revokedAt: new Date() },
        });
      else
        await prisma.user.update({
          where: { id: fixture.user.id },
          data:
            change === 'inactive' ? { active: false } : { role: Role.CASHIER },
        });
      const started = performance.now();
      expect(await closed).toContain('event: session.invalid');
      const elapsedMs = performance.now() - started;
      console.log(
        JSON.stringify({ scenario: change, elapsedMs, maximumMs: 3000 }),
      );
      expect(elapsedMs).toBeLessThanOrEqual(3000);
    },
  );

  it('closes at JWT expiry without waiting for a heartbeat', async () => {
    const fixture = await session(Role.ADMIN, 2);
    const response = await open(fixture.cookie);
    expect(response.status).toBe(200);
    const started = performance.now();
    expect(await readToClose(response)).toContain('event: session.invalid');
    const elapsedMs = performance.now() - started;
    console.log(
      JSON.stringify({ scenario: 'JWT expiry', elapsedMs, maximumMs: 3000 }),
    );
    expect(elapsedMs).toBeLessThanOrEqual(3000);
  });

  it('explicitly resynchronizes a cursor outside retention without losing bigint precision', async () => {
    const fixture = await session();
    const old = await prisma.operationEvent.create({
      data: {
        type: 'table.changed',
        entityType: 'RestaurantTable',
        entityId: randomUUID(),
        version: 9007199254740993n,
        createdAt: new Date(0),
      },
    });
    events.push(old.id);
    const response = await open(fixture.cookie, {
      'last-event-id': old.id.toString(),
    });
    const reader = response.body!.getReader();
    const frame = new TextDecoder().decode((await reader.read()).value);
    expect(frame).toContain('event: resync.required');
    expect(frame).toContain('cursor_expired');
    expect(frame).toMatch(/id: \d+/);
    await reader.cancel();
  });
});
