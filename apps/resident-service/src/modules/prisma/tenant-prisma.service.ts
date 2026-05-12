import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@resido/resident-client';
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

        // Apply Tenant Isolation Extension
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
                            // Inject tenantId into queries
                            if (['findMany', 'findFirst', 'count', 'aggregate', 'groupBy'].includes(operation)) {
                                args.where = { ...args.where, tenantId };
                            } else if (['findUnique', 'update', 'delete', 'upsert'].includes(operation)) {
                                // For unique operations, we must include tenantId to ensure isolation
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

    // Backward compatibility helpers (refactor callers later)
    getWriteClient(_dbName?: string) { return this.client; }
    getReadClient(_dbName?: string) { return this.reader; }
}
