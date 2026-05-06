import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { OtpService } from './otp.service';

@Module({
    imports: [HttpModule],
    providers: [OtpService],
    exports: [OtpService],
})
export class OtpModule { }
