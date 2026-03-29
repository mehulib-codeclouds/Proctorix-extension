import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { verify } from 'argon2';
import type { OAuth2Client } from 'google-auth-library';
import {google} from 'googleapis'
import { Equal, In, type Repository } from 'typeorm';
import { Session } from '/entities/session.entity';
import type { User } from '/entities/user.entity';
import { UsersService } from '../users/users.service';
import { GoogleOAuthConfiguration } from './config/google-oauth.config';

@Injectable()
export class SessionsService {
  private readonly oauthClient: OAuth2Client;

  constructor(
    @InjectRepository(Session)
    private readonly sessionsRepository: Repository<Session>,
    @Inject(UsersService) private readonly usersService: UsersService,
    @Inject(GoogleOAuthConfiguration)
    googleOAuthConfiguration: GoogleOAuthConfiguration,
  ) {
    this.oauthClient = new google.auth.OAuth2(
      googleOAuthConfiguration.clientId,
      googleOAuthConfiguration.clientSecret,
      googleOAuthConfiguration.redirectUrl,
    );
  }

  async getGoogleOAuthUrl() {
    return this.oauthClient.generateAuthUrl({
      scope: [
        'https://www.googleapis.com/auth/userinfo.email',
        'https://www.googleapis.com/auth/userinfo.profile',
      ],
      include_granted_scopes: true,
    });
  }

  async getSessionFromGoogleCallback({
    code,
    error,
  }: {
    code: string;
    error?: string;
  }) {
    if (error) return null;

    const { tokens } = await this.oauthClient.getToken(code);
    this.oauthClient.setCredentials(tokens);

    if (
      !tokens.scope?.includes(
        'https://www.googleapis.com/auth/userinfo.email',
      ) ||
      !tokens.scope?.includes(
        'https://www.googleapis.com/auth/userinfo.profile',
      )
    )
      return null;

    const auth = google.oauth2({
      version: 'v2',
      auth: this.oauthClient,
    });
    const userInfo = await auth.userinfo.get();
    const userData = userInfo.data;

    if (!userData.email) return null;

    let user = await this.usersService.findOne({ email: userData.email });
    if (!user) {
      if (!userData.name) return null;

      user = await this.usersService.create({
        name: userData.name,
        email: userData.email,
        isVerified: true,
      });
    }

    if (!user.isVerified)
      await this.usersService.update({ id: user.id, isVerified: true}, user );

    const session = this.sessionsRepository.create({ user });
    return this.sessionsRepository.save(session);
  }

  async findOne(id: string) {
    return this.sessionsRepository.findOneBy({ id });
  }

  async findOneForUser(id: string, user: User) {
    const session = await this.sessionsRepository.findOneBy({ id });
    if (!session || session.userId !== user.id) return null;

    return session;
  }

  async findMany(args?: { id?: string[]; userId?: string }) {
    return this.sessionsRepository.findBy({
      ...(args?.id && { id: In(args.id) }),
      ...(args?.userId && { user: { id: Equal(args.userId) } }),
    });
  }

  async create({ email, password }: { email: string; password: string }) {
    const user = await this.usersService.findOne({ email });
    if (!user || !user.password) return null;

    const isPasswordCorrect = await verify(user.password, password);
    if (!isPasswordCorrect) return null;

    const session = this.sessionsRepository.create({
      user,
    });
    return this.sessionsRepository.save(session);
  }

  async update({ id, lastUsedAt }: { id: string; lastUsedAt?: Date }) {
    const session = await this.findOne(id);
    if (!session) return null;

    if (lastUsedAt) session.lastUsedAt = lastUsedAt;

    return this.sessionsRepository.save(session);
  }

  async delete(id: string, user: User) {
    const session = await this.findOne(id);
    if (!session) return null;

    if (session.userId !== user.id) return null;

    await this.sessionsRepository.delete(id);
    return session;
  }

  async deleteMany(id: string[], user: User) {
    const sessions = await this.findMany({ id });

    const deletableSessions = sessions.filter(
      (session) => session.userId === user.id,
    );

    if (deletableSessions.length === 0) return [];

    const deletableIds = deletableSessions.map((session) => session.id);

    await this.sessionsRepository.delete(deletableIds);

    return deletableSessions;
  }
}