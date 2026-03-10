import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddIsVerifiedAndVerifiedAtColumnsInUsersTable1773122542765
  implements MigrationInterface
{
  name = 'AddIsVerifiedAndVerifiedAtColumnsInUsersTable1773122542765';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD "is_verified" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD "verification_token" uuid NOT NULL DEFAULT uuid_generate_v4()`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD CONSTRAINT "UQ_659bd3bd8868bd1decb467d9396" UNIQUE ("verification_token")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" DROP CONSTRAINT "UQ_659bd3bd8868bd1decb467d9396"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN "verification_token"`,
    );
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "is_verified"`);
  }
}
