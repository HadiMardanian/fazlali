import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddContentReports1726000000008 implements MigrationInterface {
  name = 'AddContentReports1726000000008';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE [content_reports] (
        [id]           UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID(),
        [mediaId]      UNIQUEIDENTIFIER NOT NULL,
        [reporterRef]  NVARCHAR(255)    NOT NULL,
        [reason]       TEXT             NOT NULL,
        [status]       VARCHAR(20)      NOT NULL DEFAULT 'pending',
        [handledBy]    NVARCHAR(255)    NULL,
        [handledAt]    DATETIME2        NULL,
        [createdAt]    DATETIME2        NOT NULL DEFAULT GETUTCDATE(),
        CONSTRAINT [PK_content_reports] PRIMARY KEY CLUSTERED ([id])
      )
    `);
    await queryRunner.query(`
      ALTER TABLE [content_reports]
        ADD CONSTRAINT [FK_content_reports_media]
        FOREIGN KEY ([mediaId]) REFERENCES [media]([id]) ON DELETE CASCADE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE [content_reports] DROP CONSTRAINT [FK_content_reports_media]`);
    await queryRunner.query(`DROP TABLE [content_reports]`);
  }
}
