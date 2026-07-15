import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  constructor() {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      super();
      return;
    }
    const url = new URL(databaseUrl);
    if (!url.searchParams.has('connection_limit')) {
      url.searchParams.set(
        'connection_limit',
        process.env.CONNECTION_LIMIT ?? '10',
      );
    }
    if (!url.searchParams.has('pool_timeout')) {
      url.searchParams.set(
        'pool_timeout',
        process.env.POOL_TIMEOUT_SECONDS ?? '10',
      );
    }
    super({ datasources: { db: { url: url.toString() } } });
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
