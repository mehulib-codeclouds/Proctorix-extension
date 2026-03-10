import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateMcqOptionsTable1773125088022 implements MigrationInterface {
  name = 'CreateMcqOptionsTable1773125088022';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "mcq_options" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "question_id" uuid NOT NULL, CONSTRAINT "PK_3f2f23f5178838900abfae6da9d" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "mcq_options" ADD CONSTRAINT "FK_150dfc55aaa457cce97fc1fde23" FOREIGN KEY ("question_id") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "mcq_options" DROP CONSTRAINT "FK_150dfc55aaa457cce97fc1fde23"`,
    );
    await queryRunner.query(`DROP TABLE "mcq_options"`);
  }
}
