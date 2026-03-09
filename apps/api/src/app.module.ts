import { ConfigifyModule } from '@itgorillaz/configify';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppConfiguration } from './config/app.config';
import { Session } from './entities/session.entity';
import { User } from './entities/user.entity';

@Module({
  imports: [
    ConfigifyModule.forRootAsync(),
    TypeOrmModule.forRootAsync({
      useFactory: (appConfiguration: AppConfiguration) => ({
        type: 'postgres',
        url: appConfiguration.databaseUrl,
        entities: [User, Session],
      }),
      inject: [AppConfiguration],
    }),
  ],
})
export class AppModule {}
