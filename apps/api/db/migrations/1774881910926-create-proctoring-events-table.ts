import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateProctoringEventsTable1774881910926 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE proctoring_event_type_enum AS ENUM (
        'exam_started',
        'tab_switch',
        'window_blur',
        'fullscreen_exit',
        'fullscreen_enter',
        'right_click',
        'copy_attempt',
        'paste_attempt',
        'exam_ended'
      );

      CREATE TABLE "proctoring_events" (
        "id"          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "attempt_id"  UUID NOT NULL REFERENCES "attempts"("id") ON DELETE CASCADE,
        "event_type"  proctoring_event_type_enum NOT NULL,
        "metadata"    JSONB,
        "occurred_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "created_at"  TIMESTAMPTZ NOT NULL DEFAULT now()
      );

      CREATE INDEX idx_proctoring_events_attempt ON proctoring_events(attempt_id);
      CREATE INDEX idx_proctoring_events_type    ON proctoring_events(event_type);
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE IF EXISTS "proctoring_events";
      DROP TYPE IF EXISTS proctoring_event_type_enum;
    `);
  }
}