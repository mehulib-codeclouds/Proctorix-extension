import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAttemptsTable1773124169715 implements MigrationInterface {
  name = 'CreateAttemptsTable1773124169715';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "attempts" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "started_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "ended_at" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "exam_id" uuid NOT NULL, "candidate_id" uuid NOT NULL, CONSTRAINT "PK_295ca261e361fd2fd217754dcac" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "attempts" ADD CONSTRAINT "FK_d167176b022a0f255e652f07f48" FOREIGN KEY ("exam_id") REFERENCES "exams"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "attempts" ADD CONSTRAINT "FK_ccaadf96b9506374cb2fc6f1ef8" FOREIGN KEY ("candidate_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "attempts" DROP CONSTRAINT "FK_ccaadf96b9506374cb2fc6f1ef8"`,
    );
    await queryRunner.query(
      `ALTER TABLE "attempts" DROP CONSTRAINT "FK_d167176b022a0f255e652f07f48"`,
    );
    await queryRunner.query(`DROP TABLE "attempts"`);
  }
}
