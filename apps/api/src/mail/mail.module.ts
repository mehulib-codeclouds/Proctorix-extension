import { Module } from '@nestjs/common';
import { ResendModule } from 'nestjs-resend';
import { ResendConfiguration } from './config/resend.config';
import { MailService } from './mail.service';

@Module({
  imports: [
    ResendModule.forRootAsync({
      useFactory: (resendConfiguration: ResendConfiguration) => ({
        apiKey: resendConfiguration.apiKey,
      }),
      inject: [ResendConfiguration],
    }),
  ],
  providers: [MailService],
  exports: [MailService],
})
export class MailModule {}
