import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { AsyncLocalStorage } from 'async_hooks';

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
    public client: PrismaClient;
    public reader: PrismaClient;
    public static als = new AsyncLocalStorage<{ tenantId: string }>();

    constructor(private config: ConfigService) {
        this.client = new PrismaClient({
            datasources: { db: { url: config.get('CORE_WRITE_URL') } },
        });

        this.reader = new PrismaClient({
            datasources: { db: { url: config.get('CORE_READ_URL') } },
        });

        this.client = this.applyTenantIsolation(this.client);
        this.reader = this.applyTenantIsolation(this.reader);
    }

    async onModuleInit() {
        await Promise.all([this.client.$connect(), this.reader.$connect()]);
    }

    async onModuleDestroy() {
        await Promise.all([this.client.$disconnect(), this.reader.$disconnect()]);
    }

    private applyTenantIsolation(client: any) {
        return client.$extends({
            query: {
                $allModels: {
                    async $allOperations({ model, operation, args, query }: any) {
                        const store = PrismaService.als.getStore();
                        const tenantId = store?.tenantId;

                        if (tenantId) {
                            if (['findMany', 'findFirst', 'count', 'aggregate', 'groupBy'].includes(operation)) {
                                args.where = { ...args.where, tenantId };
                            } else if (['findUnique', 'update', 'delete', 'upsert'].includes(operation)) {
                                if (args.where) {
                                    args.where = { ...args.where, tenantId };
                                }
                            } else if (operation === 'create') {
                                args.data = { ...args.data, tenantId };
                            } else if (operation === 'createMany') {
                                if (Array.isArray(args.data)) {
                                    args.data = args.data.map((item: any) => ({ ...item, tenantId }));
                                }
                            }
                        }
                        return query(args);
                    },
                },
            },
        });
    }

    getWriteClient(_dbName?: string) { return this.client; }
    getReadClient(_dbName?: string) { return this.reader; }
}
