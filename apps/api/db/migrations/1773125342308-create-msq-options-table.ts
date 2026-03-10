import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateMsqOptionsTable1773125342308 implements MigrationInterface {
  name = 'CreateMsqOptionsTable1773125342308';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "msq_options" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "has_partial_marking" boolean NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "question_id" uuid NOT NULL, CONSTRAINT "PK_5934ff3d5f316e99901d00a9074" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "msq_options" ADD CONSTRAINT "FK_11fbc92db233f8b903c88171ab3" FOREIGN KEY ("question_id") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "msq_options" DROP CONSTRAINT "FK_11fbc92db233f8b903c88171ab3"`,
    );
    await queryRunner.query(`DROP TABLE "msq_options"`);
  }
}
