import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '@resido/business-client';
import { withDbPool } from '../../common/db-pool';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
    public reader: PrismaClient;

    constructor(config: ConfigService) {
        super({
            datasources: {
                db: {
                    url: withDbPool(config.get('CORE_WRITE_URL')),
                },
            },
        });

        this.reader = new PrismaClient({
            datasources: {
                db: {
                    url: withDbPool(config.get('CORE_READ_URL') || config.get('CORE_WRITE_URL')),
                },
            },
        });
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
