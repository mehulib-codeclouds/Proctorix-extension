import { DataSource } from 'typeorm';

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  synchronize: false,
  logging: true,
  entities: ['./src/entities/*.entity.ts'],
  migrations: ['./db/migrations/*.ts'],
});
