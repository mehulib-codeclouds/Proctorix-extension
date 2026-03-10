import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateMcqAnswersTable1773126143237 implements MigrationInterface {
    name = 'CreateMcqAnswersTable1773126143237'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "mcq_answers" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "question_id" uuid NOT NULL, "option_id" uuid NOT NULL, CONSTRAINT "REL_809d2c240b03eb31c545a3020a" UNIQUE ("question_id"), CONSTRAINT "REL_b7d375da2fc3dfbd7ebfc2c2a2" UNIQUE ("option_id"), CONSTRAINT "PK_29b52a2ce4a15333d1bcaca12b1" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "mcq_answers" ADD CONSTRAINT "FK_809d2c240b03eb31c545a3020a2" FOREIGN KEY ("question_id") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "mcq_answers" ADD CONSTRAINT "FK_b7d375da2fc3dfbd7ebfc2c2a2d" FOREIGN KEY ("option_id") REFERENCES "mcq_options"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "mcq_answers" DROP CONSTRAINT "FK_b7d375da2fc3dfbd7ebfc2c2a2d"`);
        await queryRunner.query(`ALTER TABLE "mcq_answers" DROP CONSTRAINT "FK_809d2c240b03eb31c545a3020a2"`);
        await queryRunner.query(`DROP TABLE "mcq_answers"`);
    }

}
