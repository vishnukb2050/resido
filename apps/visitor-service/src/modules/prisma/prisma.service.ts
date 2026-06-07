import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@resido/visitor-client';
import { withDbPool } from '../../common/db-pool';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  public reader: PrismaClient;

  constructor() {
    // Cap the per-client pool (see withDbPool). The schema datasource reads
    // TENANT_DATABASE_URL; re-apply it here with pool params so many ECS tasks
    // don't exhaust Postgres connections.
    const url = withDbPool(process.env.TENANT_DATABASE_URL);
    super(url ? { datasources: { db: { url } } } : undefined);

    const readUrl = withDbPool(process.env.CORE_READ_URL || process.env.TENANT_DATABASE_URL);
    this.reader = new PrismaClient(readUrl ? { datasources: { db: { url: readUrl } } } : undefined);
  }

  async onModuleInit() {
    await Promise.all([
      this.$connect(),
      this.reader.$connect(),
    ]);
  }

  async onModuleDestroy() {
    await Promise.all([
      this.$disconnect(),
      this.reader.$disconnect(),
    ]);
  }
}
