import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BlogsController } from './blogs.controller';
import { BlogsService } from './blogs.service';
import { StorageModule } from '../storage/storage.module';
import { MediaModule } from '../media/media.module';
import { FlareGateway } from './flare.gateway';

@Module({
    imports: [
        HttpModule,
        StorageModule,
        MediaModule,
        JwtModule.registerAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (config: ConfigService) => ({
                secret: config.get('JWT_SECRET'),
            }),
        }),
    ],
    controllers: [BlogsController],
    providers: [BlogsService, FlareGateway],
})
export class BlogsModule {}
