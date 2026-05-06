import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class OtpService {
    constructor(
        private config: ConfigService,
        private http: HttpService,
    ) { }

    async sendOtp(phone: string, otp: string): Promise<void> {
        const provider = this.config.get('OTP_PROVIDER', 'msg91');

        if (provider === 'msg91') {
            await this.sendViaMSG91(phone, otp);
        } else if (provider === 'twilio') {
            await this.sendViaTwilio(phone, otp);
        } else {
            console.log(`[DEV] OTP for ${phone}: ${otp}`);
        }
    }

    private async sendViaMSG91(phone: string, otp: string): Promise<void> {
        const authKey = this.config.get('MSG91_AUTH_KEY');
        const templateId = this.config.get('MSG91_TEMPLATE_ID');
        
        // Ensure 91 prefix if not present
        const mobile = phone.startsWith('91') ? phone : `91${phone}`;

        await firstValueFrom(
            this.http.post(
                'https://control.msg91.com/api/v5/otp',
                { 
                    template_id: templateId, 
                    mobile: mobile, 
                    otp: otp,
                    var1: 'Resido' 
                },
                { headers: { authkey: authKey } },
            ),
        );
    }

    private async sendViaTwilio(phone: string, otp: string): Promise<void> {
        const accountSid = this.config.get('TWILIO_ACCOUNT_SID');
        const authToken = this.config.get('TWILIO_AUTH_TOKEN');
        const from = this.config.get('TWILIO_FROM_NUMBER');

        const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
        await firstValueFrom(
            this.http.post(
                `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
                new URLSearchParams({ Body: `Your Resido OTP is ${otp}`, From: from, To: phone }),
                { headers: { Authorization: `Basic ${auth}` } },
            ),
        );
    }
}
