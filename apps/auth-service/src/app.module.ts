import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './modules/prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { OtpModule } from './modules/otp/otp.module';
import { WorkspaceModule } from './modules/workspace/workspace.module';
import { ClientsModule } from './modules/clients/clients.module';
import { StaffModule } from './modules/staff/staff.module';
import { CacheModule } from './modules/cache/cache.module';
import { StorageModule } from './modules/storage/storage.module';
import { ProfileModule } from './modules/profile/profile.module';
import { NotesModule } from './modules/notes/notes.module';

@Module({
    imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        PrismaModule,
        CacheModule,
        OtpModule,
        AuthModule,
        WorkspaceModule,
        ClientsModule,
        StaffModule,
        StorageModule,
        ProfileModule,
        NotesModule,
    ],
})
export class AppModule { }
