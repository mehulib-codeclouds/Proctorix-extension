import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAttemptMsqAnswersTable1773127740319
  implements MigrationInterface
{
  name = 'CreateAttemptMsqAnswersTable1773127740319';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "attempt_msq_answers" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "attempt_id" uuid NOT NULL, "question_id" uuid NOT NULL, "option_id" uuid NOT NULL, CONSTRAINT "UQ_2ffb6d28c4e6f8104a50a0194b0" UNIQUE ("attempt_id", "question_id", "option_id"), CONSTRAINT "PK_f3a355ba6629966c9a6fc9f14b1" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "attempt_msq_answers" ADD CONSTRAINT "FK_3c8c2089923a03a5cc2db80a833" FOREIGN KEY ("attempt_id") REFERENCES "attempts"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "attempt_msq_answers" ADD CONSTRAINT "FK_2b8aca57fc58188388791e5ec3d" FOREIGN KEY ("question_id") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "attempt_msq_answers" ADD CONSTRAINT "FK_5c88c9c43e2a8aa5202afb77c0d" FOREIGN KEY ("option_id") REFERENCES "msq_options"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "attempt_msq_answers" DROP CONSTRAINT "FK_5c88c9c43e2a8aa5202afb77c0d"`,
    );
    await queryRunner.query(
      `ALTER TABLE "attempt_msq_answers" DROP CONSTRAINT "FK_2b8aca57fc58188388791e5ec3d"`,
    );
    await queryRunner.query(
      `ALTER TABLE "attempt_msq_answers" DROP CONSTRAINT "FK_3c8c2089923a03a5cc2db80a833"`,
    );
    await queryRunner.query(`DROP TABLE "attempt_msq_answers"`);
  }
}
