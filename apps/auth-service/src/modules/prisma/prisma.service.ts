import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient as MasterClient } from '@resido/master-client';
import { PrismaClient as UserClient } from '@resido/user-client';
import { PrismaClient as CoreClient } from '@resido/resident-client';

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
    public masterClient: MasterClient;
    public masterRead: MasterClient;
    public userClient: UserClient;
    public userRead: UserClient;
    public coreClient: CoreClient;
    public coreRead: CoreClient;

    constructor(config: ConfigService) {
        this.masterClient = new MasterClient({
            datasources: { db: { url: config.get('MASTER_WRITE_URL') } },
        });
        this.masterRead = new MasterClient({
            datasources: { db: { url: config.get('MASTER_READ_URL') } },
        });

        this.userClient = new UserClient({
            datasources: { db: { url: config.get('USER_WRITE_URL') } },
        });
        this.userRead = new UserClient({
            datasources: { db: { url: config.get('USER_READ_URL') } },
        });
        this.coreClient = new CoreClient({
            datasources: { db: { url: config.get('CORE_WRITE_URL') } },
        });
        this.coreRead = new CoreClient({
            datasources: { db: { url: config.get('CORE_READ_URL') } },
        });
    }

    async onModuleInit() {
        await Promise.all([
            this.masterClient.$connect(),
            this.masterRead.$connect(),
            this.userClient.$connect(),
            this.userRead.$connect(),
            this.coreClient.$connect(),
            this.coreRead.$connect(),
        ]);
    }

    async onModuleDestroy() {
        await Promise.all([
            this.masterClient.$disconnect(),
            this.masterRead.$disconnect(),
            this.userClient.$disconnect(),
            this.userRead.$disconnect(),
            this.coreClient.$disconnect(),
            this.coreRead.$disconnect(),
        ]);
    }
}
