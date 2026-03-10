import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAttemptMcqAnswersTable1773127311355
  implements MigrationInterface
{
  name = 'CreateAttemptMcqAnswersTable1773127311355';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "attempt_mcq_answers" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "attempt_id" uuid NOT NULL, "question_id" uuid NOT NULL, "option_id" uuid NOT NULL, CONSTRAINT "UQ_f25c1675d7ff1cc53c3433232e0" UNIQUE ("attempt_id", "question_id"), CONSTRAINT "PK_70e159195d29911c20affc0988e" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "attempt_mcq_answers" ADD CONSTRAINT "FK_b970d302a098349f5f5194b3748" FOREIGN KEY ("attempt_id") REFERENCES "attempts"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "attempt_mcq_answers" ADD CONSTRAINT "FK_74d8ea5fccd853b7cd2a17d7d3a" FOREIGN KEY ("question_id") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "attempt_mcq_answers" ADD CONSTRAINT "FK_64bb6638f091d34b1023c1bae5f" FOREIGN KEY ("option_id") REFERENCES "mcq_options"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "attempt_mcq_answers" DROP CONSTRAINT "FK_64bb6638f091d34b1023c1bae5f"`,
    );
    await queryRunner.query(
      `ALTER TABLE "attempt_mcq_answers" DROP CONSTRAINT "FK_74d8ea5fccd853b7cd2a17d7d3a"`,
    );
    await queryRunner.query(
      `ALTER TABLE "attempt_mcq_answers" DROP CONSTRAINT "FK_b970d302a098349f5f5194b3748"`,
    );
    await queryRunner.query(`DROP TABLE "attempt_mcq_answers"`);
  }
}
