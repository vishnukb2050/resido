import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient as MasterClient } from '@resido/master-client';
import { PrismaClient as UserClient } from '@resido/user-client';
import { PrismaClient as CoreClient } from '@resido/resident-client';
import { PrismaClient as GeoClient } from '@resido/geo-client';
import { withDbPool } from '../../common/db-pool';

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
    public masterClient: MasterClient;
    public masterRead: MasterClient;
    public userClient: UserClient;
    public userRead: UserClient;
    public coreClient: CoreClient;
    public coreRead: CoreClient;
    public geoClient: GeoClient;
    public geoRead: GeoClient;

    constructor(config: ConfigService) {
        this.masterClient = new MasterClient({
            datasources: { db: { url: withDbPool(config.get('MASTER_WRITE_URL')) } },
        });
        this.masterRead = new MasterClient({
            datasources: { db: { url: withDbPool(config.get('MASTER_READ_URL')) } },
        });

        this.userClient = new UserClient({
            datasources: { db: { url: withDbPool(config.get('USER_WRITE_URL')) } },
        });
        this.userRead = new UserClient({
            datasources: { db: { url: withDbPool(config.get('USER_READ_URL')) } },
        });
        this.coreClient = new CoreClient({
            datasources: { db: { url: withDbPool(config.get('CORE_WRITE_URL')) } },
        });
        this.coreRead = new CoreClient({
            datasources: { db: { url: withDbPool(config.get('CORE_READ_URL')) } },
        });

        // Fallback for GEO URLs if they are missing from env
        const geoWriteUrl = config.get('GEO_WRITE_URL') || `${config.get('RDS_WRITE_URL')}/resido_geodata?schema=public`;
        const geoReadUrl = config.get('GEO_READ_URL') || `${config.get('RDS_READ_URL')}/resido_geodata?schema=public`;

        this.geoClient = new GeoClient({
            datasources: { db: { url: withDbPool(geoWriteUrl) } },
        });
        this.geoRead = new GeoClient({
            datasources: { db: { url: withDbPool(geoReadUrl) } },
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
            this.geoClient.$connect(),
            this.geoRead.$connect(),
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
            this.geoClient.$disconnect(),
            this.geoRead.$disconnect(),
        ]);
    }
}
