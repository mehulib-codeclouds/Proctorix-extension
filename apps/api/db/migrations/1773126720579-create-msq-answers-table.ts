import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateMsqAnswersTable1773126720579 implements MigrationInterface {
  name = 'CreateMsqAnswersTable1773126720579';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "msq_answers" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "question_id" uuid NOT NULL, "option_id" uuid NOT NULL, CONSTRAINT "REL_3609564ca032f845c9f18156cb" UNIQUE ("option_id"), CONSTRAINT "PK_877d66906dd9dfd3bc38b8a031c" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "msq_answers" ADD CONSTRAINT "FK_c05e9b51e8d31d213a14a69d79d" FOREIGN KEY ("question_id") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "msq_answers" ADD CONSTRAINT "FK_3609564ca032f845c9f18156cb3" FOREIGN KEY ("option_id") REFERENCES "msq_options"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "msq_answers" DROP CONSTRAINT "FK_3609564ca032f845c9f18156cb3"`,
    );
    await queryRunner.query(
      `ALTER TABLE "msq_answers" DROP CONSTRAINT "FK_c05e9b51e8d31d213a14a69d79d"`,
    );
    await queryRunner.query(`DROP TABLE "msq_answers"`);
  }
}
