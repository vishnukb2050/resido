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
        try {
            const authKey = this.config.get('MSG91_AUTH_KEY');
            const templateId = this.config.get('MSG91_TEMPLATE_ID');
            
            // Format phone number: strip non-digits (+ or spaces) and ensure correct 91 prefix
            const cleanPhone = phone.replace(/\D/g, '');
            const mobile = cleanPhone.startsWith('91') && cleanPhone.length > 10 ? cleanPhone : `91${cleanPhone.slice(-10)}`;

            console.log(`[DEBUG] Sending MSG91 OTP to ${mobile} with template ${templateId}`);

            const response = await firstValueFrom(
                this.http.post(
                    `https://control.msg91.com/api/v5/otp?template_id=${templateId}&mobile=${mobile}&authkey=${authKey}&otp=${otp}`,
                    { 
                        var1: 'Resido' 
                    },
                    { headers: { 'Content-Type': 'application/json' } },
                ),
            );

            console.log(`[DEBUG] MSG91 Response:`, response.data);
        } catch (error: any) {
            const errorMsg = error.response?.data || error.message;
            console.error(`[ERROR] MSG91 API Failure:`, errorMsg);
            throw new Error(`MSG91 OTP delivery failed: ${JSON.stringify(errorMsg)}`);
        }
    }

    private async sendViaTwilio(phone: string, otp: string): Promise<void> {
        try {
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
        } catch (error: any) {
            console.warn(`[WARNING] Twilio API Failure:`, error.response?.data || error.message);
            console.log(`[FALLBACK] Twilio SMS dispatch failed. For development/testing, please use this OTP from the console: ${otp}`);
            // Gracefully handle failure in development/sandbox without throwing
        }
    }
}
