import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@resido/visitor-client';
import { withDbPool } from '../../common/db-pool';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    // Cap the per-client pool (see withDbPool). The schema datasource reads
    // TENANT_DATABASE_URL; re-apply it here with pool params so many ECS tasks
    // don't exhaust Postgres connections.
    const url = withDbPool(process.env.TENANT_DATABASE_URL);
    super(url ? { datasources: { db: { url } } } : undefined);
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
