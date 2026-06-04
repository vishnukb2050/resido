import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@resido/notification-client';
import { ConfigService } from '@nestjs/config';
import { withDbPool } from '../../common/db-pool';

@Injectable()
export class PrismaService extends PrismaClient {
    constructor(config: ConfigService) {
        super({
            datasources: {
                db: { url: withDbPool(config.get('AUTH_DATABASE_URL')) },
            },
        });
    }

    async onModuleInit() {
        await this.$connect();
    }

    async onModuleDestroy() {
        await this.$disconnect();
    }
}
