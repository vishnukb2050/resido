import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
    public reader: PrismaClient;

    constructor(config: ConfigService) {
        super({
            datasources: {
                db: { url: config.get('DB_WRITE_ENDPOINT') },
            },
        });

        this.reader = new PrismaClient({
            datasources: {
                db: { url: config.get('DB_READ_ENDPOINT') },
            },
        });
    }

    async onModuleInit() {
        await this.$connect();
        await this.reader.$connect();
    }

    async onModuleDestroy() {
        await this.$disconnect();
        await this.reader.$disconnect();
    }
}
