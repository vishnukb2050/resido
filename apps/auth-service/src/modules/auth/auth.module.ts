import { Module } from '@nestjs/common';
import { OtpModule } from '../otp/otp.module';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { PrismaModule } from '../prisma/prisma.module';
import { JwtStrategy } from '../../common/strategies/jwt.strategy';
import { FollowModule } from '../follow/follow.module';
import { StorageModule } from '../storage/storage.module';

@Module({
    imports: [
        PrismaModule,
        OtpModule,
        FollowModule,
        StorageModule,
        JwtModule.registerAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (config: ConfigService) => ({
                secret: config.get('JWT_SECRET'),
                signOptions: { expiresIn: config.get('JWT_EXPIRES_IN', '7d') },
            }),
        }),
    ],
    controllers: [AuthController],
    providers: [AuthService, JwtStrategy],
    exports: [AuthService],
})
export class AuthModule { }
