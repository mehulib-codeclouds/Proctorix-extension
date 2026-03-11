import { Inject, Injectable } from '@nestjs/common';
import { ResendService } from 'nestjs-resend';

@Injectable()
export class MailService {
  constructor(
    @Inject(ResendService) private readonly resendService: ResendService,
  ) {}

  async sendMail(args: {
    from: string;
    to: string;
    subject: string;
    html: string;
  }) {
    this.resendService.send(args);
  }
}
