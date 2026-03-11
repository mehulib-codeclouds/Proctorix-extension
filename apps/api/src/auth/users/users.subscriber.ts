import { randomUUID } from 'node:crypto';
import { Inject } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import {
  type DataSource,
  type EntitySubscriberInterface,
  EventSubscriber,
  type InsertEvent,
  type UpdateEvent,
} from 'typeorm';
import { User } from '/entities/user.entity';
import { MailService } from '/mail/mail.service';
import { UserConfiguration } from './config/user.config';

@EventSubscriber()
export class UsersSubscriber implements EntitySubscriberInterface<User> {
  constructor(
    @InjectDataSource() dataSource: DataSource,
    @Inject(MailService) private readonly mailService: MailService,
    @Inject(UserConfiguration)
    private readonly userConfiguration: UserConfiguration,
  ) {
    dataSource.subscribers.push(this);
  }

  listenTo() {
    return User;
  }

  afterInsert(event: InsertEvent<User>) {
    if (event.entity.isVerified) return;

    const url = new URL(this.userConfiguration.verificationLink);
    url.searchParams.append('token', event.entity.verificationToken);

    this.mailService.sendMail({
      from: this.userConfiguration.verificationMailFrom,
      to: event.entity.email,
      subject: 'Welcome to Proctorix',
      html: `Welcome to Proctorix ${event.entity.name}! To get started please verify your email address by clicking this <a href="${url.toString()}">link</a>.`,
    });
  }

  beforeUpdate(event: UpdateEvent<User>) {
    if (!event.entity) return;

    const verificationChanged = event.updatedColumns.some(
      (col) => col.propertyName === 'isVerified',
    );

    if (!verificationChanged) return;

    event.entity.verificationToken = randomUUID();
  }

  async afterUpdate(event: UpdateEvent<User>) {
    if (!event.entity || event.entity?.isVerified) return;

    const url = new URL(this.userConfiguration.verificationLink);
    url.searchParams.append('token', event.entity.verificationToken);

    this.mailService.sendMail({
      from: this.userConfiguration.verificationMailFrom,
      to: event.entity.email,
      subject: 'Verify your Email Address',
      html: `You have changed your email to ${event.entity.email}. Please verify your email address by clicking this <a href="${url.toString()}">link</a>.`,
    });
  }
}
