import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './modules/prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { OtpModule } from './modules/otp/otp.module';
import { ClientsModule } from './modules/clients/clients.module';
import { StaffModule } from './modules/staff/staff.module';
import { CacheModule } from './modules/cache/cache.module';
import { StorageModule } from './modules/storage/storage.module';
import { ProfileModule } from './modules/profile/profile.module';
import { NotesModule } from './modules/notes/notes.module';
import { FollowModule } from './modules/follow/follow.module';
import { ProfileMediaModule } from './modules/profile-media/profile-media.module';

@Module({
    imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        PrismaModule,
        ProfileMediaModule,
        CacheModule,
        OtpModule,
        AuthModule,
        ClientsModule,
        StaffModule,
        StorageModule,
        ProfileModule,
        NotesModule,
        FollowModule,
    ],
})
export class AppModule { }
